type FeedEntityRef =
    | string
    | {
          _id?: string;
          id?: string;
          title?: string;
          name?: string;
          image?: string;
          images?: string[];
      }
    | null
    | undefined;

export function resolveFeedEntityId(value: FeedEntityRef): string {
    if (!value) return "";
    if (typeof value === "string") return value;
    return value._id ?? value.id ?? "";
}

export function resolveFeedEntityImage(value: FeedEntityRef): string | undefined {
    if (!value || typeof value === "string") return undefined;
    if (typeof value.image === "string" && value.image.trim()) {
        return value.image;
    }
    const firstImage = value.images?.find(
        (img) => typeof img === "string" && img.trim(),
    );
    return firstImage;
}

export function resolveFeedEntityName(value: FeedEntityRef): string | undefined {
    if (!value || typeof value === "string") return undefined;
    const name = value.title ?? value.name;
    return typeof name === "string" && name.trim() ? name.trim() : undefined;
}
