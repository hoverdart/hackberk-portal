/**
 * The fallback shown while a signed-in route's data loads.
 *
 * The rail lives in the layout above this, so it stays painted and interactive
 * while this renders — the point is that a navigation never blanks the whole
 * window. Deliberately un-animated: an entrance here would reintroduce exactly
 * the flash the motion rule in `app/styles/motion.css` exists to prevent.
 */
export default function Loading() {
  return (
    <div className="stage-loading" role="status">
      <span className="sr-only">Loading</span>
    </div>
  );
}
