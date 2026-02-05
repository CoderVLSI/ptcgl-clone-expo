# Remaining Tasks: Stadiums & Image Fixes

Based on your request, here is the plan to complete the Stadium integration and fix image loading.

## 1. UI Integration (Stadium Placement)
**Goal:** Place the Stadium card on the left side, parallel to the End Turn button, effectively "in play".

- [ ] **Export Component:** Add `StadiumZone` to `components/index.ts`.
- [ ] **Update PlayMat:** Modify `components/PlayMat.tsx` to include the `StadiumZone`.
    - **Positioning:** Use specific styles to position it to the left of the player's active area/bench, aligning roughly with where the "End Turn" button or deck area might be, but specifically "left side".
    - **Props:** Pass `stadium` and `stadiumOwner` from `gameState` to `StadiumZone`.

## 2. Image Loading Verification
**Goal:** Ensure card images load correctly from the repository/API.

- [ ] **Verify ID Format:** The `images.pokemontcg.io` API usually requires the format `set-number` (e.g., `sv1-001` or `sv1-1`).
    - *Current Check:* My code uses `id` from the sets. I need to ensure the ID from `pokemon-tcg-data` matches what `images.pokemontcg.io` expects.
    - *Action:* If images consistently fail, I may need to adjust the ID generation logic (e.g., strip leading zeros or ensure they match).
- [ ] **Fallback Handling:** Ensure that if an image fails to load, the text name is clearly visible (already partially handled in Card component, but double-check).

## 3. Opponent Logic (AI)
**Goal:** Allow the AI to play Stadium cards, replacing yours if different.

- [ ] **Update AI Logic (`utils/aiOpponent.ts`):**
    - Add a logic branch for `PLAY_TRAINER` where if the card is a `Stadium`, it checks if it can be played (i.e., not same name as current stadium).
    - Ensure `applyAIAction` calls the same state update logic as `playTrainer` (or shares the hook logic via a refactor, or duplicates the "replace stadium" logic).

## 4. Game Rules Refinement
**Goal:** Strictly enforce Stadium rules.

- [ ] **One Stadium per Turn:** Ensure logic restricts playing a Stadium if one was already played *this turn* (though the user didn't explicitly ask for this strictness yet, it's standard rules).
- [ ] **Same Name Rule:** Verify the "if different name" check is robust (already implemented in `playTrainer`, double check).

## Summary of Next Steps
1.  **Export & Import:** Fix `components/index.ts`.
2.  **Edit PlayMat:** Add the `<StadiumZone />` to the render.
3.  **Update AI:** Teach `aiOpponent.ts` about stadiums.
4.  **Verify Images:** Run game and visually check.
