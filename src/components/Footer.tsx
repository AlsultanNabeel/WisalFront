import TikTokIcon from '@/assets/footer/tiktok--inside-icon.png';
import LinkedInIcon from '@/assets/institution/linkedin-icon.svg';
import TwitterIcon from '@/assets/institution/twitter-icon.svg';
import FacebookIcon from '@/assets/institution/facebook-icon.svg';
import InstagramIcon from '@/assets/footer/instagram-icon.png';

export default function Footer() {
  return (
    <footer className="bg-footer text-white mt-auto h-[144px]">
      <div className="h-full max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 px-4">
        <div className="flex items-center gap-4 text-sm">
          <span className="cursor-pointer">Terms of Service</span>
          <span className="cursor-pointer">Privacy Policy</span>
          <span className="cursor-pointer">Contact Us</span>
        </div>
        <div className="flex items-center gap-5 text-sm">
          <span className="cursor-pointer inline-flex"><img src={TikTokIcon} alt="TikTok" className="h-10 w-10 object-contain" /></span>
          <span className="cursor-pointer inline-flex"><img src={LinkedInIcon} alt="LinkedIn" className="h-10 w-10 object-contain" /></span>
          <span className="cursor-pointer inline-flex"><img src={TwitterIcon} alt="Twitter" className="h-10 w-10 object-contain" /></span>
          <span className="cursor-pointer inline-flex"><img src={FacebookIcon} alt="Facebook" className="h-10 w-10 object-contain" /></span>
          <span className="cursor-pointer inline-flex"><img src={InstagramIcon} alt="Instagram" className="h-10 w-10 object-contain" /></span>
        </div>
        <p className="text-sm">.Copyrights©2025 Wesal.com, All Rights Reserved</p>
      </div>
    </footer>
  );
}
