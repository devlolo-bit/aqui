import { AppImage } from '@/components/ui/app-image';

void AppImage; // used by the line the platform writes below when the app has a photo

/**
 * The sign-in screens' photo. The platform writes the image prompt here as a LITERAL at the first build, because
 * that is how the image step finds it and generates the picture. An app without a photo gets `HAS_HERO = false`
 * and every layout falls back to its no-image composition.
 */
export const HAS_HERO: boolean = /*@fab:has-hero*/ true; /*@fab:end*/

/** what the photo shows: people | place | product | food | abstract. Layouts use it to pick a crop and scrim. */
export const HERO_SUBJECT: string = /*@fab:hero-subject*/ 'people'; /*@fab:end*/

export function HeroImage({ className, priority = false }: { className?: string; priority?: boolean }) {
  if (!HAS_HERO) return null;
  return (
    /*@fab:hero-image*/
    <AppImage
      slot="auth-hero"
      prompt="Realistic editorial portrait of a Brazilian woman in her thirties, elegant and self-possessed, looking straight at the camera with a calm confident expression, tailored blazer, soft natural daylight, clean light background, sophisticated contemporary mood, no text in the image."
      alt=""
      className={className}
      priority={priority}
      width={1200}
      height={1500}
    />
    /*@fab:end*/
  );
}
