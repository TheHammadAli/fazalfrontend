import { Muxer, ArrayBufferTarget } from "mp4-muxer";

/**
 * Shrinks a picked video to a 720p H.264/AAC MP4 before it's uploaded.
 *
 * The file input hands back the camera's original untouched — a 2-3 minute
 * phone clip is 100-200MB — which is what makes video posts slow enough to time
 * out. This re-encodes in the browser with WebCodecs, which runs on the
 * platform's hardware encoder, so no multi-megabyte wasm download and no
 * cross-origin-isolation headers are needed.
 *
 * Browsers without WebCodecs still get the duration check; they just upload the
 * original, exactly as they do today.
 */

export const MAX_DURATION_SECONDS = 60;

/** Long edge of the output. 16:9 lands on 1280x720, 9:16 on 720x1280 — whichever
 *  edge is longer gets capped, so orientation survives and nothing stretches. */
const MAX_DIMENSION = 1280;

/**
 * Size is a budget, not a hard cap. An earlier pass aimed at 500-700KB and the
 * result was visibly mushy: 480p needs ~1000-1500kbps to hold up, and that
 * budget forced a third of it. The original problem was 100-200MB uploads
 * timing out, and 720p at a watchable bitrate is still a 5-10x cut — so the
 * budget is set where quality survives rather than at the smallest number.
 */
const TARGET_BYTES = 8 * 1024 * 1024;

/** Above this, a second pass at a lower bitrate is worth trying. */
const MAX_OUTPUT_BYTES = 10 * 1024 * 1024;

const AUDIO_BITRATE = 96_000;

/**
 * The quality floor — never encode worse than this regardless of duration.
 * 2500kbps at 720p is sharp on screen; a 60s clip lands ~19MB.
 */
const MIN_VIDEO_BITRATE = 2_500_000;

/** Ceiling for very short clips, so a 5s video doesn't balloon needlessly. */
const MAX_VIDEO_BITRATE = 4_000_000;

/** H.264 Main profile, level 3.1 — 3600 macroblocks, i.e. exactly 1280x720@30. */
const H264_CODEC = "avc1.4D401F";
const AAC_CODEC = "mp4a.40.2";

/** Thrown before any encoding work happens, so a too-long video costs nothing. */
export class VideoTooLongError extends Error {
  durationSeconds: number;
  constructor(durationSeconds: number) {
    super(
      `Video is ${Math.round(durationSeconds)}s, limit is ${MAX_DURATION_SECONDS}s`,
    );
    this.name = "VideoTooLongError";
    this.durationSeconds = durationSeconds;
  }
}

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

/** Bits/sec for the video track so video+audio lands near TARGET_BYTES, never
 *  below the quality floor. */
export const computeVideoBitrate = (durationSeconds: number): number => {
  if (!durationSeconds || durationSeconds <= 0) return MAX_VIDEO_BITRATE;
  const forVideo = (TARGET_BYTES * 8) / durationSeconds - AUDIO_BITRATE;
  return Math.round(clamp(forVideo, MIN_VIDEO_BITRATE, MAX_VIDEO_BITRATE));
};

/** H.264 needs even dimensions; the long edge is capped and never upscaled. */
const fitWithin720p = (width: number, height: number) => {
  const longEdge = Math.max(width, height);
  const scale = longEdge > MAX_DIMENSION ? MAX_DIMENSION / longEdge : 1;
  const even = (value: number) => Math.max(2, Math.round(value * scale / 2) * 2);
  return { width: even(width), height: even(height) };
};

type VideoInfo = { durationSeconds: number; width: number; height: number };

/** Reads duration/dimensions off a hidden <video>, so a too-long clip is
 *  rejected before any expensive work. */
export const probeVideo = (file: File): Promise<VideoInfo> =>
  new Promise((resolve, reject) => {
    const element = document.createElement("video");
    const url = URL.createObjectURL(file);
    const cleanup = () => {
      URL.revokeObjectURL(url);
      element.removeAttribute("src");
    };
    element.preload = "metadata";
    element.muted = true;
    element.onloadedmetadata = () => {
      const info = {
        durationSeconds: element.duration,
        width: element.videoWidth,
        height: element.videoHeight,
      };
      cleanup();
      resolve(info);
    };
    element.onerror = () => {
      cleanup();
      reject(new Error("This video format could not be read"));
    };
    element.src = url;
  });

/** Coarse, synchronous check — the real per-config check happens below. */
export const hasCompressionApis = (): boolean =>
  typeof window !== "undefined" &&
  typeof window.VideoEncoder !== "undefined" &&
  typeof window.VideoFrame !== "undefined" &&
  typeof window.OffscreenCanvas !== "undefined" &&
  typeof HTMLVideoElement !== "undefined" &&
  "requestVideoFrameCallback" in HTMLVideoElement.prototype;

const canEncodeH264 = async (width: number, height: number) => {
  try {
    const support = await window.VideoEncoder.isConfigSupported({
      codec: H264_CODEC,
      width,
      height,
    });
    return Boolean(support?.supported);
  } catch {
    return false;
  }
};

const canEncodeAac = async (sampleRate: number, numberOfChannels: number) => {
  try {
    if (typeof window.AudioEncoder === "undefined") return false;
    const support = await window.AudioEncoder.isConfigSupported({
      codec: AAC_CODEC,
      sampleRate,
      numberOfChannels,
      bitrate: AUDIO_BITRATE,
    });
    return Boolean(support?.supported);
  } catch {
    return false;
  }
};

/** Decodes the whole soundtrack up front. Returns null when the file has no
 *  usable audio, in which case the output is simply video-only. */
const decodeAudio = async (file: File): Promise<AudioBuffer | null> => {
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!AudioCtx) return null;
    const context = new AudioCtx();
    const buffer = await context.decodeAudioData(await file.arrayBuffer());
    void context.close();
    return buffer.numberOfChannels > 0 && buffer.length > 0 ? buffer : null;
  } catch {
    return null;
  }
};

const encodeAudioTrack = async (
  audio: AudioBuffer,
  muxer: Muxer<ArrayBufferTarget>,
) => {
  const encoder = new window.AudioEncoder({
    output: (chunk, meta) => muxer.addAudioChunk(chunk, meta),
    error: (err: unknown) => console.error("Audio encode error:", err),
  });
  encoder.configure({
    codec: AAC_CODEC,
    sampleRate: audio.sampleRate,
    numberOfChannels: audio.numberOfChannels,
    bitrate: AUDIO_BITRATE,
  });

  // ~100ms per AudioData keeps memory flat on a long clip.
  const framesPerChunk = Math.floor(audio.sampleRate / 10);
  const channels: Float32Array[] = [];
  for (let c = 0; c < audio.numberOfChannels; c++) {
    channels.push(audio.getChannelData(c));
  }

  for (let offset = 0; offset < audio.length; offset += framesPerChunk) {
    const frames = Math.min(framesPerChunk, audio.length - offset);
    // f32-planar wants every channel laid end to end in one buffer.
    const planar = new Float32Array(frames * audio.numberOfChannels);
    for (let c = 0; c < audio.numberOfChannels; c++) {
      planar.set(channels[c].subarray(offset, offset + frames), c * frames);
    }
    const data = new window.AudioData({
      format: "f32-planar",
      sampleRate: audio.sampleRate,
      numberOfFrames: frames,
      numberOfChannels: audio.numberOfChannels,
      timestamp: Math.round((offset / audio.sampleRate) * 1_000_000),
      data: planar,
    });
    encoder.encode(data);
    data.close();
  }

  await encoder.flush();
  encoder.close();
};

const encodeAtBitrate = async (
  file: File,
  info: VideoInfo,
  bitrate: number,
  audio: AudioBuffer | null,
  onProgress?: (fraction: number) => void,
): Promise<File> => {
  const { width, height } = fitWithin720p(info.width, info.height);

  const muxer = new Muxer({
    target: new ArrayBufferTarget(),
    fastStart: "in-memory",
    video: { codec: "avc", width, height },
    ...(audio
      ? {
          audio: {
            codec: "aac" as const,
            numberOfChannels: audio.numberOfChannels,
            sampleRate: audio.sampleRate,
          },
        }
      : {}),
  });

  const encoder = new window.VideoEncoder({
    output: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
    error: (err: unknown) => console.error("Video encode error:", err),
  });
  encoder.configure({
    codec: H264_CODEC,
    width,
    height,
    bitrate,
    framerate: 30,
    // The muxer expects length-prefixed AVCC, not Annex-B.
    avc: { format: "avc" },
  });

  const element = document.createElement("video");
  const url = URL.createObjectURL(file);
  element.src = url;
  element.muted = true;
  element.playsInline = true;

  const canvas = new OffscreenCanvas(width, height);
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas 2D context unavailable");

  try {
    await new Promise<void>((resolve, reject) => {
      element.onloadeddata = () => resolve();
      element.onerror = () => reject(new Error("Video could not be decoded"));
    });

    await new Promise<void>((resolve, reject) => {
      let frameCount = 0;

      const onFrame = (_now: number, metadata: { mediaTime: number }) => {
        try {
          context.drawImage(element, 0, 0, width, height);
          const frame = new window.VideoFrame(canvas, {
            timestamp: Math.max(0, Math.round(metadata.mediaTime * 1_000_000)),
          });
          // A keyframe every ~2s keeps seeking usable without costing much.
          encoder.encode(frame, { keyFrame: frameCount % 60 === 0 });
          frame.close();
          frameCount++;
          if (onProgress && info.durationSeconds > 0) {
            onProgress(clamp(metadata.mediaTime / info.durationSeconds, 0, 1));
          }
        } catch (err) {
          reject(err as Error);
          return;
        }
        element.requestVideoFrameCallback(onFrame);
      };

      element.onended = () => resolve();
      element.onerror = () => reject(new Error("Video playback failed"));
      element.requestVideoFrameCallback(onFrame);
      // Muted playback at 2x roughly halves the wait; timestamps come from
      // mediaTime, so the output still plays back at normal speed.
      element.playbackRate = 2;
      element.play().catch(reject);
    });

    await encoder.flush();
    encoder.close();

    if (audio) await encodeAudioTrack(audio, muxer);

    muxer.finalize();
    const { buffer } = muxer.target;
    return new File([buffer], `video_${Date.now()}.mp4`, { type: "video/mp4" });
  } finally {
    // An encoder left open holds onto a hardware encode session; close it even
    // when the frame loop threw partway through.
    if (encoder.state !== "closed") {
      try {
        encoder.close();
      } catch {
        /* already torn down */
      }
    }
    element.pause();
    URL.revokeObjectURL(url);
    element.removeAttribute("src");
  }
};

export type PreparedVideo = { file: File; compressed: boolean };

/**
 * Validates duration, then compresses if the browser can. Never throws for an
 * unsupported browser — it just hands back the original.
 *
 * Throws VideoTooLongError for anything over the limit, before encoding.
 */
export const prepareVideoForUpload = async (
  file: File,
  onProgress?: (fraction: number) => void,
): Promise<PreparedVideo> => {
  const info = await probeVideo(file);

  // Fail closed rather than let an unmeasurable video through unchecked — a
  // NaN/Infinity duration would otherwise slip straight past the limit below.
  if (!Number.isFinite(info.durationSeconds) || info.durationSeconds <= 0) {
    throw new Error("Could not read this video's duration");
  }

  // Half a second of slack: a "60 second" recording is often 60.02s.
  if (info.durationSeconds > MAX_DURATION_SECONDS + 0.5) {
    throw new VideoTooLongError(info.durationSeconds);
  }

  const longEdge = Math.max(info.width, info.height);
  // Already small and already within 720p — re-encoding could only make it look
  // worse for no size win.
  if (file.size <= MAX_OUTPUT_BYTES && longEdge > 0 && longEdge <= MAX_DIMENSION) {
    return { file, compressed: false };
  }

  if (!hasCompressionApis()) return { file, compressed: false };

  const { width, height } = fitWithin720p(info.width, info.height);
  if (!(await canEncodeH264(width, height))) return { file, compressed: false };

  const decoded = await decodeAudio(file);
  const audio =
    decoded && (await canEncodeAac(decoded.sampleRate, decoded.numberOfChannels))
      ? decoded
      : null;

  const bitrate = computeVideoBitrate(info.durationSeconds);
  let output = await encodeAtBitrate(file, info, bitrate, audio, onProgress);

  // One corrective pass, only when there's real headroom above the floor —
  // this cannot loop, there is no third attempt.
  if (output.size > MAX_OUTPUT_BYTES && bitrate > MIN_VIDEO_BITRATE) {
    const scaled = Math.round(
      clamp(bitrate * (TARGET_BYTES / output.size), MIN_VIDEO_BITRATE, bitrate),
    );
    if (scaled < bitrate) {
      try {
        const second = await encodeAtBitrate(file, info, scaled, audio, onProgress);
        if (second.size > 0 && second.size < output.size) output = second;
      } catch (err) {
        // The first pass is already a valid result — keep it.
        console.warn("Second compression pass failed:", err);
      }
    }
  }

  // If compression somehow made things worse, keep the original.
  return output.size > 0 && output.size < file.size
    ? { file: output, compressed: true }
    : { file, compressed: false };
};
