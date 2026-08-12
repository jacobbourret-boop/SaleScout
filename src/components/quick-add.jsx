import { useEffect, useRef, useState } from "react";
import { Camera, Check, CircleNotch, Crosshair, ImageSquare, MapPin, Sparkle, Tag } from "@phosphor-icons/react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "./ui/sheet";
import { buildPhotoSuggestion, compressPhoto } from "../lib/utils";

const categories = ["Furniture", "Tools", "Kids", "Clothes", "Collectibles", "Electronics", "Books", "Garden", "Home"];

export function QuickAdd({ open, onOpenChange, center, onLocate, onPublish, onError, pending }) {
  const [step, setStep] = useState("photo");
  const [photoDataUrl, setPhotoDataUrl] = useState("");
  const [title, setTitle] = useState("");
  const [type, setType] = useState("garage");
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [location, setLocation] = useState(center);
  const [address, setAddress] = useState("");
  const [hours, setHours] = useState("Today until 2 PM");
  const [note, setNote] = useState("");
  const [photoBusy, setPhotoBusy] = useState(false);
  const [photoError, setPhotoError] = useState("");
  const [locationState, setLocationState] = useState("ready");
  const inputRef = useRef(null);
  const wasOpenRef = useRef(false);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (!open) {
      wasOpenRef.current = false;
      return;
    }
    if (wasOpenRef.current) return;
    wasOpenRef.current = true;
    setStep("photo");
    setPhotoDataUrl("");
    setTitle("");
    setType("garage");
    setSelectedCategories([]);
    setLocation(center);
    setAddress("");
    setHours("Today until 2 PM");
    setNote("");
    setPhotoBusy(false);
    setPhotoError("");
    setLocationState("ready");
  }, [center, open]);

  async function preparePhoto(file) {
    if (!file) return;
    setPhotoBusy(true);
    setPhotoError("");
    try {
      const [photo, locationResult] = await Promise.all([
        compressPhoto(file),
        onLocate({ silent: true })
          .then((detectedLocation) => ({ location: detectedLocation, detected: true }))
          .catch(() => ({ location: center, detected: false }))
      ]);
      const suggestion = buildPhotoSuggestion(file);
      setPhotoDataUrl(photo);
      setTitle(suggestion.title);
      setSelectedCategories([suggestion.category]);
      setLocation(locationResult.location || center);
      setLocationState(locationResult.detected ? "detected" : "approximate");
      setStep("review");
    } catch {
      const message = "That photo could not be prepared. Try another image.";
      setPhotoError(message);
      onError?.(message);
    } finally {
      setPhotoBusy(false);
    }
  }

  function continueWithoutPhoto() {
    setTitle("Neighborhood treasure sale");
    setSelectedCategories(["Home"]);
    setStep("review");
    onLocate({ silent: true }).then((next) => {
      setLocation(next);
      setLocationState("detected");
    }).catch(() => setLocationState("approximate"));
  }

  async function publish(event) {
    event.preventDefault();
    const sale = await onPublish({
      type,
      title,
      address: address.trim() || "Near current location",
      hours,
      note,
      categories: selectedCategories,
      highlights: selectedCategories.map((category) => category.toLowerCase()),
      location,
      photoDataUrl
    });
    if (sale) onOpenChange(false);
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="quick-add-sheet" aria-describedby="quick-add-description">
        <div className="quick-add-shell">
          <SheetHeader className="pr-14">
            <div className="quick-add-progress" aria-label={step === "photo" ? "Photo step" : "Review step"}>
              <span className="is-complete" />
              <span className={step === "review" ? "is-complete" : ""} />
            </div>
            <SheetTitle>{step === "photo" ? "Spot it. Snap it." : "Ready to share"}</SheetTitle>
            <SheetDescription id="quick-add-description">
              {step === "photo" ? "One photo is enough. SaleScout fills in the rest." : "Check the suggestions, then publish for nearby scouts."}
            </SheetDescription>
          </SheetHeader>

          <AnimatePresence mode="wait" initial={false}>
            {step === "photo" ? (
              <motion.div key="photo" className="quick-photo-step" initial={reduceMotion ? false : { opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} exit={reduceMotion ? undefined : { opacity: 0, x: -12 }}>
                <button type="button" className="camera-capture" onClick={() => inputRef.current?.click()} disabled={photoBusy}>
                  <span className="camera-capture-icon">{photoBusy ? <CircleNotch className="spin" size={34} weight="bold" /> : <Camera size={36} weight="fill" />}</span>
                  <strong>{photoBusy ? "Preparing your photo" : "Take a photo"}</strong>
                  <span>Camera or photo library</span>
                </button>
                <input ref={inputRef} className="sr-only" type="file" accept="image/*" capture="environment" onChange={(event) => { const file = event.currentTarget.files?.[0]; event.currentTarget.value = ""; preparePhoto(file); }} />
                {photoError ? <p className="quick-add-error" role="alert">{photoError}</p> : null}
                <div className="quick-add-benefits" aria-label="Automatic sale details">
                  <span><Crosshair size={20} weight="duotone" /><strong>Location</strong><small>Detected</small></span>
                  <span><Sparkle size={20} weight="duotone" /><strong>Title</strong><small>Suggested</small></span>
                  <span><Tag size={20} weight="duotone" /><strong>Category</strong><small>Suggested</small></span>
                </div>
                <button className="text-button" type="button" onClick={continueWithoutPhoto}>Continue without a photo</button>
              </motion.div>
            ) : (
              <motion.form key="review" className="quick-review-step" onSubmit={publish} initial={reduceMotion ? false : { opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={reduceMotion ? undefined : { opacity: 0, x: 12 }}>
                <div className="quick-review-media">
                  {photoDataUrl ? <img src={photoDataUrl} alt="Preview of the sale you are reporting" /> : <span><ImageSquare size={30} /></span>}
                  <button type="button" onClick={() => setStep("photo")}>Change photo</button>
                </div>

                <div className="auto-detected-row">
                  <Badge variant="success"><Check size={13} weight="bold" />{locationState === "detected" ? "Location found" : "Map location"}</Badge>
                  <Badge variant="discovery"><Sparkle size={13} weight="fill" />Suggestions ready</Badge>
                </div>

                <label className="field-block">
                  <span>Suggested title</span>
                  <input name="title" value={title} onChange={(event) => setTitle(event.target.value)} maxLength={80} required />
                </label>

                <fieldset className="category-picker">
                  <legend>What is there?</legend>
                  <div>
                    {categories.map((category) => {
                      const active = selectedCategories.includes(category);
                      return (
                        <button key={category} type="button" className={active ? "is-active" : ""} aria-pressed={active} onClick={() => setSelectedCategories((current) => active ? current.filter((item) => item !== category) : [...current, category])}>
                          {active ? <Check size={14} weight="bold" /> : null}{category}
                        </button>
                      );
                    })}
                  </div>
                </fieldset>

                <div className="location-confirmation">
                  <MapPin size={22} weight="fill" />
                  <div><strong>Current location</strong><span>{location.lat.toFixed(4)}, {location.lng.toFixed(4)}</span></div>
                  <button type="button" onClick={() => onLocate({ silent: false }).then((next) => { setLocation(next); setLocationState("detected"); }).catch(() => setLocationState("approximate"))}>Refresh</button>
                </div>

                <details className="optional-details">
                  <summary>Edit details</summary>
                  <div className="optional-details-grid">
                    <label className="field-block"><span>Sale type</span><select name="type" value={type} onChange={(event) => setType(event.target.value)}><option value="garage">Garage sale</option><option value="yard">Yard sale</option><option value="estate">Estate sale</option><option value="moving">Moving sale</option><option value="rummage">Rummage sale</option></select></label>
                    <label className="field-block"><span>Hours</span><input name="hours" value={hours} onChange={(event) => setHours(event.target.value)} maxLength={80} /></label>
                    <label className="field-block"><span>Address or cross streets</span><input name="address" value={address} onChange={(event) => setAddress(event.target.value)} maxLength={120} placeholder="Optional" /></label>
                    <label className="field-block"><span>Scout note</span><textarea name="note" value={note} onChange={(event) => setNote(event.target.value)} maxLength={240} rows={3} placeholder="Anything shoppers should know?" /></label>
                  </div>
                </details>

                <Button type="submit" variant="discovery" size="lg" className="w-full" disabled={!title.trim() || pending}>
                  {pending ? <CircleNotch className="spin" size={20} weight="bold" /> : <Camera size={20} weight="bold" />}
                  {pending ? "Publishing" : "Publish sale"}
                </Button>
              </motion.form>
            )}
          </AnimatePresence>
        </div>
      </SheetContent>
    </Sheet>
  );
}
