import { getBannerCropStyle } from "@/lib/cropHelpers";

export default function ProfileBanner({ bannerUrl, bannerCrop, className }) {
  const style = getBannerCropStyle(bannerCrop);
  return (
    <div className={`relative overflow-hidden ${className || "h-32 sm:h-52"}`}>
      {bannerUrl ? (
        <img src={bannerUrl} alt="banner" className="w-full h-full object-cover" style={style} />
      ) : (
        <div className="w-full h-full bg-gradient-to-r from-primary/20 via-chart-2/10 to-chart-3/5" />
      )}
    </div>
  );
}