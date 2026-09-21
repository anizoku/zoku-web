import { useEffect, useState } from 'react';
import { useSupabaseAuth } from '../../lib/SupabaseAuthContext';
import { getAvatarCropStyle, getBannerCropStyle } from '../../lib/cropHelpers';

export function useProfileMedia(profile) {
  const { profileService, user } = useSupabaseAuth();
  const id = profile?.id;
  const avatarPath = profile?.avatar_url;
  const bannerPath = profile?.banner_url;
  const identity = JSON.stringify([user?.id, id, avatarPath, bannerPath]);
  const [state, setState] = useState({});
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let live = true;
    let generation = 0;
    async function refresh() {
      const ticket = ++generation;
      const result = await Promise.allSettled([
        profileService.signMedia('avatar', avatarPath, id),
        profileService.signMedia('banner', bannerPath, id),
      ]);
      if (live && generation === ticket) setState({ identity,
        avatar: result[0].status === 'fulfilled' ? result[0].value : null,
        banner: result[1].status === 'fulfilled' ? result[1].value : null,
        error: result.some((item) => item.status === 'rejected'),
      });
    }
    if (id) void refresh();
    const interval = id && (avatarPath || bannerPath) ? setInterval(refresh, 45000) : null;
    return () => { live = false; clearInterval(interval); };
  }, [profileService, user?.id, id, avatarPath, bannerPath, identity, retry]);
  return { ...(state.identity === identity ? state : {}), retry: () => setRetry((value) => value + 1) };
}

export function ProfileImage({ src, crop, alt, className, fallback, kind = 'avatar' }) {
  const [failed, setFailed] = useState(null);
  // Keep the saved v2 schema; dispatch to the appropriate presentational helper.
  const style = kind === 'banner' ? getBannerCropStyle(crop) : getAvatarCropStyle(crop);
  return src && src !== failed ? <img src={src} alt={alt} className={className} style={style} onError={() => setFailed(src)} /> : fallback;
}
