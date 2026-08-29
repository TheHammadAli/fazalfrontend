"use client";

import { useCallback } from "react";
import { useAppDispatch } from "@/store/store";
import { logout } from "@/store/reducers/authReducer";
import { useUnregisterFcmTokenMutation } from "@/store/services/profileService";
import { getPushToken } from "@/utils/firebasePush";

/**
 * Signs the user out, detaching this browser from the account first.
 *
 * A push token identifies the browser, not the session, so clearing local auth
 * state alone leaves the account still subscribed here — notifications would
 * keep arriving after sign-out, and would be shown to whoever uses the browser
 * next. The token has to be released while the auth header is still valid,
 * hence before the logout action runs.
 *
 * The unregister call is best-effort: sign-out must not depend on the network,
 * and a token left behind is pruned later anyway once FCM reports it dead.
 */
export function useLogout() {
  const dispatch = useAppDispatch();
  const [unregisterFcmToken] = useUnregisterFcmTokenMutation();

  return useCallback(async () => {
    try {
      const token = await getPushToken();
      if (token) await unregisterFcmToken(token).unwrap();
    } catch {
      // Ignored on purpose — see above.
    }

    dispatch(logout());
  }, [dispatch, unregisterFcmToken]);
}
