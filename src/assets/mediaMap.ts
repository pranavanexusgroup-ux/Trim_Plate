import heroBowlImg from './images/hero_healthy_bowl_1793126299356.jpg';
import breakfastOatsImg from './images/breakfast_oats_eggs_1793126300993.jpg';
import greenSaladImg from './images/green_salad_sprouts_1793126302595.jpg';
import cafeSandwichImg from './images/cafe_sandwich_pasta_1793126304648.jpg';
import mealPrepTrayImg from './images/meal_prep_tiffin_tray_1793126306019.jpg';
import heroSlideFeastImg from './images/hero_slide_fresh_feast_1793130274159.jpg';
import heroSlideGreenImg from './images/hero_slide_green_lifestyle_1793130275930.jpg';
import heroSlideGymImg from './images/hero_slide_gym_protein_1793130276252.jpg';
import dietitianAnanyaImg from './images/dietitian_ananya_sen_1793430392722.jpg';
import dietitianArjunImg from './images/dietitian_arjun_bose_1793430395120.jpg';
import dietitianMeeraImg from './images/dietitian_meera_chatterjee_1793430395123.jpg';
import grilledProteinImg from './images/grilled_protein_platter_1793432526031.jpg';
import quinoaAvocadoImg from './images/quinoa_avocado_closeup_1793432528091.jpg';
import multigrainWrapImg from './images/multigrain_wrap_cafe_1793432529910.jpg';
import berryChiaImg from './images/berry_chia_smoothie_1793432532651.jpg';
import wholesomeThaliImg from './images/wholesome_thali_meal_1793432531871.jpg';

export const OFFICIAL_TRIMPLATE_LOGO =
  '/assets/aistudio/WhatsApp_Image_2026-10-25_at_6.22.43_PM_235e65d3.jpeg';

export const FALLBACK_FOOD_IMAGE = heroBowlImg;

export const MEDIA_ASSETS: Record<string, string> = {
  hero_bowl: heroBowlImg,
  breakfast_oats: breakfastOatsImg,
  green_salad: greenSaladImg,
  cafe_sandwich: cafeSandwichImg,
  meal_prep_tray: mealPrepTrayImg,
  grilled_protein: grilledProteinImg,
  quinoa_avocado: quinoaAvocadoImg,
  multigrain_wrap: multigrainWrapImg,
  berry_chia: berryChiaImg,
  wholesome_thali: wholesomeThaliImg,
  hero_slide_feast: heroSlideFeastImg,
  hero_slide_green: heroSlideGreenImg,
  hero_slide_gym: heroSlideGymImg,
  dietitian_ananya: dietitianAnanyaImg,
  dietitian_arjun: dietitianArjunImg,
  dietitian_meera: dietitianMeeraImg,
  official_logo: OFFICIAL_TRIMPLATE_LOGO,
};

export function resolveFoodImage(imageKey?: string, customUrl?: string): string {
  if (customUrl && customUrl.trim().length > 0) {
    if (MEDIA_ASSETS[customUrl]) return MEDIA_ASSETS[customUrl];
    return customUrl;
  }
  if (imageKey && MEDIA_ASSETS[imageKey]) {
    return MEDIA_ASSETS[imageKey];
  }
  if (
    imageKey &&
    (imageKey.startsWith('data:') || imageKey.startsWith('http') || imageKey.startsWith('/'))
  ) {
    return imageKey;
  }
  return heroBowlImg;
}

export function getProductGalleryUrls(product: {
  image_key?: string;
  custom_image_url?: string;
  images?: Array<{ image_url: string; is_primary?: number }>;
}): string[] {
  const candidates: string[] = [];
  const primary = resolveFoodImage(product.image_key, product.custom_image_url);
  if (primary) candidates.push(primary);

  if (Array.isArray(product.images)) {
    for (const img of product.images) {
      if (img?.image_url && img.image_url.trim()) {
        const resolved = resolveFoodImage(img.image_url, img.image_url);
        if (resolved && !candidates.includes(resolved)) {
          candidates.push(resolved);
        }
      }
    }
  }

  if (product.image_key) {
    const fallbackBase = resolveFoodImage(product.image_key);
    if (fallbackBase && !candidates.includes(fallbackBase)) {
      candidates.push(fallbackBase);
    }
  }

  return candidates.length > 0 ? candidates : [heroBowlImg];
}
