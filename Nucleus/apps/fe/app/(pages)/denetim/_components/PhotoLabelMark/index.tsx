type PhotoLabelMarkProps = {
  /** The question demands a photo and this answer raises a new finding. */
  required: boolean;
  /** At least one photo is on the device for the answer. */
  hasPhoto: boolean;
};

/*
 * The mark after the "Fotoğraflar" label of the question detail and the single
 * finding forms: "(zorunlu)" in red while the photo is missing, a quiet
 * confirmation once it is there, nothing where no photo is asked for.
 */
export function PhotoLabelMark({ required, hasPhoto }: PhotoLabelMarkProps) {
  if (!required) return null;
  return hasPhoto ? (
    <span className="text-emerald-700 dark:text-emerald-400">(zorunlu, eklendi)</span>
  ) : (
    <span className="text-rose-600 dark:text-rose-400">(zorunlu)</span>
  );
}
