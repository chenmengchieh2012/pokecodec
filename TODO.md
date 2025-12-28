# Achievement System TODO List

This document tracks the implementation status of the Achievement System.

## Implemented Logic

### Exploration
- [x] **ID 59-62**: Biome Encounters (Forest, Cave, Urban, Water)
  - Implemented `onEncounter` in `AchievementAnalyzer` and hooked it in `CommandHandler`.

### Growth
- [x] **ID 6, 47**: `evolutionsTriggered` (Evolution Time, Evolution Master)
  - Implemented `onEvolve` in `AchievementAnalyzer` and hooked it in `CommandHandler`.
- [x] **ID 73**: `movesTaught` (Move Tutor)
  - Implemented `onLearnMove` in `AchievementAnalyzer` and hooked it in `CommandHandler` (via Item).
