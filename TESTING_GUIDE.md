# Photo Gallery & Author Edit/Delete - Testing Guide

## Setup Instructions

### 1. Apply SQL Policies

Open Supabase SQL Editor and paste the contents of `supabase/sql/places_policies.sql`:

```bash
# File location
cat supabase/sql/places_policies.sql
```

This will enable RLS policies for:
- ✅ Public read access to places
- ✅ Authenticated users can insert places
- ✅ **NEW:** Authors can update their own places
- ✅ **NEW:** Authors can delete their own places

### 2. Verify Backend Setup

Make sure these exist in Supabase:

**Table: `place_media`**
- Columns: `id`, `place_id`, `author_user_id`, `media_type`, `storage_path`, `public_url`, `created_at`
- RLS policies already configured for photo uploads

**Storage Bucket: `place-media`**
- Should be public
- Policies configured for authenticated uploads

### 3. Start Development Server

```bash
npm run dev
```

Server runs on http://localhost:3000 with 4GB RAM limit.

---

## Feature Testing Checklist

### A. Photo Gallery (All Users Can View)

#### Test 1: View Gallery as Public User
- [ ] Go to any place detail page `/p/{id}`
- [ ] Gallery section shows "Zatím tu nejsou žádné fotky" if empty
- [ ] No upload button visible (not logged in)
- [ ] If photos exist, they display in a grid (2 cols mobile, 3 cols desktop)

#### Test 2: Upload Photos as Authenticated User
- [ ] Login with Google OAuth
- [ ] Go to a place detail page
- [ ] See "📸 Přidat fotku" button in gallery section
- [ ] Click button and upload an image (JPG/PNG < 5MB)
- [ ] Photo appears in grid immediately after upload
- [ ] Photo counter shows "1 / 6"
- [ ] Upload more photos (up to 6 total)
- [ ] At 6 photos, upload button is disabled with message "Dosažen maximální počet fotek (6)"

#### Test 3: Delete Own Photos
- [ ] Hover over a photo you uploaded
- [ ] Red X button appears in top-right corner
- [ ] Click X button
- [ ] Confirmation dialog appears: "Opravdu chceš smazat tuto fotku?"
- [ ] Confirm deletion
- [ ] Photo is removed from grid
- [ ] Counter updates (e.g., "5 / 6")

#### Test 4: Cannot Delete Others' Photos
- [ ] Login as User B
- [ ] Go to a place with photos uploaded by User A
- [ ] Hover over User A's photos
- [ ] No delete button appears (hover has no effect)

#### Test 5: Photo Upload Validation
- [ ] Try uploading a file > 5MB
- [ ] Error: "Obrázek je příliš velký (max 5 MB)"
- [ ] Try uploading a non-image file (e.g., PDF)
- [ ] Error: "Nahraj pouze obrázky (JPG, PNG, atd.)"

---

### B. Author Edit/Delete for Places

#### Test 6: Author Sees Edit/Delete Buttons
- [ ] Login as User A
- [ ] Create a new place via `/create-place`
- [ ] After creation, redirected to `/places`
- [ ] Navigate to your newly created place `/p/{id}`
- [ ] See "✏️ Upravit" and "🗑️ Smazat" buttons at top-right of page

#### Test 7: Edit Place
- [ ] Click "✏️ Upravit" button
- [ ] Redirected to `/p/{id}/edit`
- [ ] Form is prefilled with existing place data
- [ ] Change the name, area, or difficulty
- [ ] Click "Uložit změny"
- [ ] Redirected back to place detail page
- [ ] Changes are visible

#### Test 8: Delete Place
- [ ] On place detail page (as author)
- [ ] Click "🗑️ Smazat" button
- [ ] Modal appears: "Smazat místo? Opravdu chceš smazat místo "{name}"? Tato akce je nevratná."
- [ ] Click "Zrušit" → modal closes, nothing happens
- [ ] Click "🗑️ Smazat" again
- [ ] Click "Smazat" in modal
- [ ] Redirected to `/places`
- [ ] Place is removed from list

#### Test 9: Non-Author Cannot Edit/Delete
- [ ] Login as User A, create a place
- [ ] Logout, login as User B
- [ ] Navigate to User A's place
- [ ] No "Upravit" or "Smazat" buttons visible
- [ ] Try manually navigating to `/p/{id}/edit`
- [ ] Redirected back to `/p/{id}` (edit page denies access)

#### Test 10: Unauthenticated Cannot Edit
- [ ] Logout
- [ ] Try navigating to `/p/{id}/edit` for any place
- [ ] Redirected to `/?login=1`

---

### C. "My Places" Filter

#### Test 11: My Places Toggle (Authenticated)
- [ ] Login as User A
- [ ] Go to `/places`
- [ ] See "Moje místa" toggle button in filter section
- [ ] Click "Moje místa"
- [ ] URL changes to `/places?mine=1`
- [ ] Only places created by User A are shown
- [ ] Counter updates: "Nalezeno X míst" (your places only)
- [ ] Click "Moje místa" again (deselect)
- [ ] URL returns to `/places`
- [ ] All places visible again

#### Test 12: My Places with Other Filters
- [ ] Click "Moje místa"
- [ ] Also select a place type (e.g., "Přírodní túra")
- [ ] URL: `/places?mine=1&types=nature_walk`
- [ ] Results show only your nature walk places
- [ ] Click "Resetovat filtry"
- [ ] All filters cleared, back to all places

#### Test 13: My Places Not Visible When Logged Out
- [ ] Logout
- [ ] Go to `/places`
- [ ] "Moje místa" toggle is not visible (only for authenticated users)

---

## Integration Tests

### Test 14: Full Workflow - User A
1. [ ] Login as User A
2. [ ] Create a place: "Sněžka", type "Vyhlídka", difficulty 5
3. [ ] Upload 3 photos to the place
4. [ ] Delete 1 photo
5. [ ] Edit the place: change difficulty to 4
6. [ ] Go to `/places?mine=1`
7. [ ] See your "Sněžka" place in results
8. [ ] Delete the place
9. [ ] Verify it's gone from `/places?mine=1`

### Test 15: Full Workflow - User B (Different User)
1. [ ] Login as User B (different Google account)
2. [ ] Create a place: "Pustevny"
3. [ ] Upload 1 photo
4. [ ] Go to `/places`
5. [ ] Find User A's "Sněžka" place (if not deleted)
6. [ ] View the place detail
7. [ ] See User A's photos but no delete buttons on them
8. [ ] No edit/delete buttons for the place
9. [ ] Upload your own photo to the place (all authenticated users can upload photos)
10. [ ] Delete only your own photo

---

## Error Handling Tests

### Test 16: RLS Policy Enforcement
- [ ] Attempt to delete a place via API/DB that you don't own → should fail
- [ ] Attempt to update a place via API/DB that you don't own → should fail

### Test 17: Storage Errors
- [ ] Upload a photo when at max 6 photos
- [ ] Error: "Maximální počet fotek je 6"
- [ ] Try to upload with slow/broken internet
- [ ] Appropriate error message shown

### Test 18: Form Validation on Edit
- [ ] Edit a place
- [ ] Clear required fields (e.g., name)
- [ ] Submit form
- [ ] Validation errors shown: "Název je povinný"

---

## Browser Testing

Recommended browsers:
- [ ] Chrome/Edge (latest)
- [ ] Safari (macOS/iOS)
- [ ] Firefox

---

## Files Changed

### New Files Created:
1. `supabase/sql/places_policies.sql` - RLS policies for UPDATE/DELETE
2. `components/PlaceGallery.tsx` - Photo upload/view/delete component
3. `components/PlaceAuthorActions.tsx` - Edit/delete buttons component
4. `components/PlaceForm.tsx` - Reusable place form (create + edit)
5. `app/p/[id]/edit/page.tsx` - Edit place page
6. `app/p/[id]/edit/actions.ts` - Update place server action

### Modified Files:
1. `app/p/[id]/page.tsx` - Added gallery & author actions
2. `app/places/page.tsx` - Added "My Places" filter support
3. `app/places/PlacesFilters.tsx` - Added "My Places" toggle
4. `app/create-place/CreatePlaceForm.tsx` - Refactored to use PlaceForm
5. `lib/db/places.ts` - Added myPlaces filter to fetchPlacesFiltered
6. `lib/placesFilters.ts` - Added myPlaces to filter types

---

## Known Limitations (MVP)

1. **Audio Upload**: Backend ready but UI not implemented (shows "Zatím vypnuto")
2. **Photo Editing**: No crop/rotate functionality
3. **Gallery Pagination**: All photos load at once (max 6 per place)
4. **Soft Delete**: Places are hard-deleted (no recovery)

---

## Quick Test Commands

```bash
# Start dev server
npm run dev

# Check if running
curl http://localhost:3000/api/health

# View SQL policies
cat supabase/sql/places_policies.sql
```

---

## Success Criteria

All features working when:
- ✅ Public users can view photos
- ✅ Authenticated users can upload photos (max 6)
- ✅ Users can delete only their own photos
- ✅ Place authors can edit/delete their places
- ✅ Non-authors cannot edit/delete others' places
- ✅ "My Places" filter shows only user's own places
- ✅ Existing filters continue to work
- ✅ All RLS policies enforced on backend

