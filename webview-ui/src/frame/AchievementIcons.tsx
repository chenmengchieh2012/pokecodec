/* eslint-disable react-refresh/only-export-components */
import React from 'react';
import { IconContext } from 'react-icons';

// Game Icons (RPG style)
import {
    GiHighGrass, GiBattleGear, GiMagicPotion, GiDna2,
    GiShoppingBag, GiHealthPotion, GiTeamUpgrade, GiNightSleep, GiSunrise,
    GiCrosshair, GiBookCover, GiOpenBook, GiBookmarklet, GiBookshelf,
    GiTrophyCup, GiHummingbird, GiButterfly, GiGardeningShears, GiFireFlower,
    GiSwimfins, GiLightningStorm, GiPsychicWaves, GiBlackBelt, GiMountainClimbing,
    GiGhost, GiDragonHead, GiSpikedDragonHead, GiShinyApple, GiNewShoot,
    GiMedal, GiLaurels, GiBroadsword, GiBrokenShield, GiCrackedShield,
    GiOneEyed, GiHeartInside, GiDiamondHard, GiCrystalBall, GiSittingDog,
    GiGiant, GiWeightLiftingUp, GiMuscleUp, GiBiceps, GiPowerLightning,
    GiStoneBlock, GiLovers, GiPiggyBank, GiMoneyStack, GiOpenTreasureChest,
    GiBackpack, GiWoodenCrate, GiMagnifyingGlass, GiPotionBall, GiHeartPlus,
    GiForest, GiCaveEntrance, GiCityCar, GiShipWheel, GiStatic,
    GiEggClutch, GiNestEggs, GiButterflyWarning, GiGymBag, GiChampions,
    GiCrown, GiTrophiesShelf, GiPhotoCamera, GiPriceTag, GiTeacher,
    GiTrashCan, GiChessKnight, GiTank, GiGlassHeart, GiRunningShoe,
    GiRopeCoil, GiHearts, GiCheckMark, GiStarsStack, GiPlasticDuck
} from 'react-icons/gi';

// Flat Color Icons (UI/Generic)
import {
    FcGlobe
} from 'react-icons/fc';

// Tabler Icons (Tech/Dev)
import {
    TbPokeball, TbDroplet,
    TbBugOff, TbGitMerge, TbGitPullRequest,
    TbError404,
    TbCopy, TbOld, TbTrash, TbTerminal,
    TbGitCommit, TbCake, TbSun, TbChartPie
} from 'react-icons/tb';

// VS Code Icons
import { VscDebugRestart, VscError, VscTools, VscServerProcess, VscRocket, VscDeviceMobile, VscSymbolStructure, VscScreenFull, VscBeaker, VscRunAll } from 'react-icons/vsc';


// Helper to wrap icons with consistent styling
const IconWrapper = ({ children, color = "currentColor", size = "24px" }: { children: React.ReactNode, color?: string, size?: string }) => (
    <IconContext.Provider value={{ color, size, className: "react-icon" }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '24px', height: '24px' }}>
            {children}
        </div>
    </IconContext.Provider>
);

// --- Icon Components ---

export const IconHelloWorld = () => <IconWrapper color="#42A5F5"><FcGlobe /></IconWrapper>;
export const IconFirstEncounter = () => <IconWrapper color="#66BB6A"><GiHighGrass /></IconWrapper>;
export const IconGotcha = () => <IconWrapper color="#EF5350"><TbPokeball /></IconWrapper>;
export const IconBattleReady = () => <IconWrapper color="#FF5722"><GiBattleGear /></IconWrapper>;
export const IconLevelUp = () => <IconWrapper color="#66BB6A"><GiMagicPotion /></IconWrapper>;
export const IconEvolution = () => <IconWrapper color="#FFCA28"><GiDna2 /></IconWrapper>;
export const IconShopping = () => <IconWrapper color="#42A5F5"><GiShoppingBag /></IconWrapper>;
export const IconHealer = () => <IconWrapper color="#EC407A"><GiHealthPotion /></IconWrapper>;
export const IconFullParty = () => <IconWrapper color="#AB47BC"><GiTeamUpgrade /></IconWrapper>;
export const IconNightOwl = () => <IconWrapper color="#5C6BC0"><GiNightSleep /></IconWrapper>;
export const IconEarlyBird = () => <IconWrapper color="#FF7043"><GiSunrise /></IconWrapper>;
export const IconSniper = () => <IconWrapper color="#F44336"><GiCrosshair /></IconWrapper>;
export const IconPokedexRookie = () => <IconWrapper color="#8D6E63"><GiBookCover /></IconWrapper>;
export const IconPokedexExplorer = () => <IconWrapper color="#9E9E9E"><GiOpenBook /></IconWrapper>;
export const IconPokedexPro = () => <IconWrapper color="#FFCA28"><GiBookmarklet /></IconWrapper>;
export const IconPokedexMaster = () => <IconWrapper color="#0288D1"><GiBookshelf /></IconWrapper>;
export const IconKantoChampion = () => <IconWrapper color="#FFD700"><GiTrophyCup /></IconWrapper>;
export const IconBirdWatcher = () => <IconWrapper color="#81D4FA"><GiHummingbird /></IconWrapper>;
export const IconBugCatcher = () => <IconWrapper color="#AED581"><GiButterfly /></IconWrapper>;
export const IconGardener = () => <IconWrapper color="#43A047"><GiGardeningShears /></IconWrapper>;
export const IconPyromaniac = () => <IconWrapper color="#FF5722"><GiFireFlower /></IconWrapper>;
export const IconSwimmer = () => <IconWrapper color="#29B6F6"><GiSwimfins /></IconWrapper>;
export const IconElectrician = () => <IconWrapper color="#FFEB3B"><GiLightningStorm /></IconWrapper>;
export const IconPsychicType = () => <IconWrapper color="#AB47BC"><GiPsychicWaves /></IconWrapper>;
export const IconBlackBelt = () => <IconWrapper color="#8D6E63"><GiBlackBelt /></IconWrapper>;
export const IconRockClimber = () => <IconWrapper color="#795548"><GiMountainClimbing /></IconWrapper>;
export const IconSpooky = () => <IconWrapper color="#7E57C2"><GiGhost /></IconWrapper>;
export const IconDragonTamer = () => <IconWrapper color="#3F51B5"><GiDragonHead /></IconWrapper>;
export const IconLegendaryHunter = () => <IconWrapper color="#FFD700"><GiSpikedDragonHead /></IconWrapper>;
export const IconShinyHunter = () => <IconWrapper color="#26C6DA"><GiShinyApple /></IconWrapper>;
export const IconBattleNovice = () => <IconWrapper color="#A1887F"><GiNewShoot /></IconWrapper>;
export const IconBattleVeteran = () => <IconWrapper color="#E0E0E0"><GiMedal /></IconWrapper>;
export const IconBattleLegend = () => <IconWrapper color="#FFD54F"><GiLaurels /></IconWrapper>;
export const IconSuperEffective = () => <IconWrapper color="#F44336"><GiBroadsword /></IconWrapper>;
export const IconNotVeryEffective = () => <IconWrapper color="#B0BEC5"><GiBrokenShield /></IconWrapper>;
export const IconCriticalHit = () => <IconWrapper color="#D32F2F"><GiCrackedShield /></IconWrapper>;
export const IconOneHitWonder = () => <IconWrapper color="#D32F2F"><GiOneEyed /></IconWrapper>;
export const IconCloseCall = () => <IconWrapper color="#E57373"><GiHeartInside /></IconWrapper>;
export const IconFlawlessVictory = () => <IconWrapper color="#FFC107"><GiDiamondHard /></IconWrapper>;
export const IconTypeExpert = () => <IconWrapper color="#66BB6A"><GiCrystalBall /></IconWrapper>;
export const IconUnderdog = () => <IconWrapper color="#90A4AE"><GiSittingDog /></IconWrapper>;
export const IconGiantSlayer = () => <IconWrapper color="#546E7A"><GiGiant /></IconWrapper>;
export const IconTrainingDay = () => <IconWrapper color="#8D6E63"><GiWeightLiftingUp /></IconWrapper>;
export const IconGettingStronger = () => <IconWrapper color="#43A047"><GiMuscleUp /></IconWrapper>;
export const IconPowerhouse = () => <IconWrapper color="#D32F2F"><GiBiceps /></IconWrapper>;
export const IconMaxPotential = () => <IconWrapper color="#FFD700"><GiPowerLightning /></IconWrapper>;
export const IconEvolutionMaster = () => <IconWrapper color="#2196F3"><GiDna2 /></IconWrapper>;
export const IconStoneAge = () => <IconWrapper color="#00BCD4"><GiStoneBlock /></IconWrapper>;
export const IconFriendship = () => <IconWrapper color="#F06292"><GiLovers /></IconWrapper>;
export const IconPennyPincher = () => <IconWrapper color="#A1887F"><GiPiggyBank /></IconWrapper>;
export const IconBigSpender = () => <IconWrapper color="#757575"><GiMoneyStack /></IconWrapper>;
export const IconMillionaire = () => <IconWrapper color="#FFD54F"><GiOpenTreasureChest /></IconWrapper>;
export const IconPrepared = () => <IconWrapper color="#795548"><GiBackpack /></IconWrapper>;
export const IconStockedUp = () => <IconWrapper color="#8D6E63"><GiWoodenCrate /></IconWrapper>;
export const IconCodeReviewer = () => <IconWrapper color="#333"><GiMagnifyingGlass /></IconWrapper>;
export const IconPotionMaster = () => <IconWrapper color="#9C27B0"><GiPotionBall /></IconWrapper>;
export const IconRevival = () => <IconWrapper color="#FFEB3B"><GiHeartPlus /></IconWrapper>;
export const IconBallCollector = () => <IconWrapper color="#7E57C2"><TbPokeball /></IconWrapper>;
export const IconForestRanger = () => <IconWrapper color="#2E7D32"><GiForest /></IconWrapper>;
export const IconCaveExplorer = () => <IconWrapper color="#616161"><GiCaveEntrance /></IconWrapper>;
export const IconUrbanLegend = () => <IconWrapper color="#90A4AE"><GiCityCar /></IconWrapper>;
export const IconSeaCaptain = () => <IconWrapper color="#0277BD"><GiShipWheel /></IconWrapper>;
export const IconGlitch = () => <IconWrapper color="#E91E63"><GiStatic /></IconWrapper>;
export const IconDayCare = () => <IconWrapper color="#FFCC80"><GiEggClutch /></IconWrapper>;
export const IconEggHatcher = () => <IconWrapper color="#FFE0B2"><GiNestEggs /></IconWrapper>;
export const IconSocialButterfly = () => <IconWrapper color="#81C784"><GiButterflyWarning /></IconWrapper>;
export const IconGymLeader = () => <IconWrapper color="#78909C"><GiGymBag /></IconWrapper>;
export const IconEliteFour = () => <IconWrapper color="#F44336"><GiChampions /></IconWrapper>;
export const IconChampion = () => <IconWrapper color="#FFD700"><GiCrown /></IconWrapper>;
export const IconCollector = () => <IconWrapper color="#42A5F5"><GiTrophiesShelf /></IconWrapper>;
export const IconPhotographer = () => <IconWrapper color="#455A64"><GiPhotoCamera /></IconWrapper>;
export const IconNicknameRater = () => <IconWrapper color="#FFCA28"><GiPriceTag /></IconWrapper>;
export const IconMoveTutor = () => <IconWrapper color="#CDDC39"><GiTeacher /></IconWrapper>;
export const IconMoveDeleter = () => <IconWrapper color="#9E9E9E"><GiTrashCan /></IconWrapper>;
export const IconStrategist = () => <IconWrapper color="#000"><GiChessKnight /></IconWrapper>;
export const IconTank = () => <IconWrapper color="#1976D2"><GiTank /></IconWrapper>;
export const IconGlassCannon = () => <IconWrapper color="#F44336"><GiGlassHeart /></IconWrapper>;
export const IconSpeedster = () => <IconWrapper color="#D32F2F"><GiRunningShoe /></IconWrapper>;
export const IconEscapeArtist = () => <IconWrapper color="#BDBDBD"><GiRopeCoil /></IconWrapper>;
export const IconBraveHeart = () => <IconWrapper color="#B71C1C"><GiHearts /></IconWrapper>;
export const IconCompletionist = () => <IconWrapper color="#4CAF50"><GiCheckMark /></IconWrapper>;
export const IconPerfectionist = () => <IconWrapper color="#00B0FF"><GiStarsStack /></IconWrapper>;
export const IconSyntaxError = () => <IconWrapper color="#F44336"><VscError /></IconWrapper>;
export const IconInfiniteLoop = () => <IconWrapper color="#2196F3"><VscDebugRestart /></IconWrapper>;
export const IconRefactoring = () => <IconWrapper color="#757575"><VscTools /></IconWrapper>;
export const IconFullStack = () => <IconWrapper color="#FF9800"><VscServerProcess /></IconWrapper>;
export const IconMergeConflict = () => <IconWrapper color="#F44336"><TbGitMerge /></IconWrapper>;
export const IconPullRequest = () => <IconWrapper color="#9C27B0"><TbGitPullRequest /></IconWrapper>;
export const IconDeploy = () => <IconWrapper color="#F44336"><VscRocket /></IconWrapper>;
export const IconWorksOnMyMachine = () => <IconWrapper color="#78909C"><VscDeviceMobile /></IconWrapper>;
export const IconSpaghettiCode = () => <IconWrapper color="#FFEB3B"><VscSymbolStructure /></IconWrapper>;
export const IconRubberDuck = () => <IconWrapper color="#FFEB3B"><GiPlasticDuck /></IconWrapper>;
export const Icon404 = () => <IconWrapper color="#BDBDBD"><TbError404 /></IconWrapper>;
export const IconBSOD = () => <IconWrapper color="#1565C0"><VscScreenFull /></IconWrapper>;
export const IconCopyPaste = () => <IconWrapper color="#8D6E63"><TbCopy /></IconWrapper>;
export const IconLegacySystem = () => <IconWrapper color="#424242"><TbOld /></IconWrapper>;
export const IconTechDebt = () => <IconWrapper color="#795548"><TbTrash /></IconWrapper>;
export const IconMemoryLeak = () => <IconWrapper color="#039BE5"><TbDroplet /></IconWrapper>;
export const IconGarbageCollector = () => <IconWrapper color="#4CAF50"><TbTrash /></IconWrapper>;
export const IconSudo = () => <IconWrapper color="#FFC107"><TbTerminal /></IconWrapper>;
export const IconGitBlame = () => <IconWrapper color="#FFCC80"><TbGitCommit /></IconWrapper>;
export const IconBugFix = () => <IconWrapper color="#E0E0E0"><TbBugOff /></IconWrapper>;
export const IconCanary = () => <IconWrapper color="#FFEB3B"><VscBeaker /></IconWrapper>;
export const IconTopPercentage = () => <IconWrapper color="#9C27B0"><TbChartPie /></IconWrapper>;
export const IconGodObject = () => <IconWrapper color="#FFD700"><TbSun /></IconWrapper>;
export const IconCake = () => <IconWrapper color="#F48FB1"><TbCake /></IconWrapper>;
export const IconRaceCondition = () => <IconWrapper color="#212121"><VscRunAll /></IconWrapper>;

export const CategoryIcons: Record<string, React.ReactNode> = {
    "Battle": <IconBattleReady />,
    "Pokedex": <IconPokedexRookie />,
    "Growth": <IconLevelUp />,
    "Economy": <IconPennyPincher />,
    "Exploration": <IconFirstEncounter />,
    "Items": <IconStockedUp />,
    "General": <IconHelloWorld />
};

export const AchievementIcons: Record<string, React.ReactNode> = {
    "1": <IconHelloWorld />,
    "2": <IconGotcha />,
    "3": <IconBattleReady />,
    "4": <IconEvolution />,
    "5": <IconShopping />,
    "6": <IconHealer />,
    "7": <IconFullParty />,
    "8": <IconNightOwl />,
    "9": <IconEarlyBird />,
    "10": <IconSniper />,
    "11": <IconPokedexRookie />,
    "12": <IconPokedexExplorer />,
    "13": <IconPokedexPro />,
    "14": <IconPokedexMaster />,
    "15": <IconKantoChampion />,
    "16": <IconBirdWatcher />,
    "17": <IconBugCatcher />,
    "18": <IconGardener />,
    "19": <IconPyromaniac />,
    "20": <IconSwimmer />,
    "21": <IconElectrician />,
    "22": <IconPsychicType />,
    "23": <IconBlackBelt />,
    "24": <IconRockClimber />,
    "25": <IconSpooky />,
    "26": <IconDragonTamer />,
    "27": <IconLegendaryHunter />,
    "28": <IconShinyHunter />,
    "29": <IconBattleNovice />,
    "30": <IconBattleVeteran />,
    "31": <IconBattleLegend />,
    "32": <IconSuperEffective />,
    "33": <IconNotVeryEffective />,
    "34": <IconCriticalHit />,
    "35": <IconOneHitWonder />,
    "36": <IconCloseCall />,
    "37": <IconFlawlessVictory />,
    "38": <IconTypeExpert />,
    "39": <IconUnderdog />,
    "40": <IconGiantSlayer />,
    "41": <IconTrainingDay />,
    "42": <IconGettingStronger />,
    "43": <IconPowerhouse />,
    "44": <IconMaxPotential />,
    "45": <IconEvolutionMaster />,
    "46": <IconStoneAge />,
    "47": <IconFriendship />,
    "48": <IconBigSpender />,
    "49": <IconPrepared />,
    "50": <IconPotionMaster />,
    "51": <IconRevival />,
    "52": <IconForestRanger />,
    "53": <IconCaveExplorer />,
    "54": <IconUrbanLegend />,
    "55": <IconSeaCaptain />,
    "56": <IconMoveTutor />,
    "57": <IconStrategist />,
    "58": <IconTank />,
    "59": <IconGlassCannon />,
    "60": <IconSpeedster />,
    "61": <IconBraveHeart />,
    "62": <IconSyntaxError />,
    "63": <IconInfiniteLoop />,
    "64": <IconFullStack />,
    "65": <IconMergeConflict />,
    "66": <IconWorksOnMyMachine />,
    "67": <IconSpaghettiCode />,
    "68": <IconRubberDuck />,
    "69": <IconBSOD />,
    "70": <IconCopyPaste />,
    "71": <IconLegacySystem />,
    "72": <IconTechDebt />,
    "73": <IconMemoryLeak />,
    "74": <IconGarbageCollector />,
    "75": <IconSudo />,
    "76": <IconGitBlame />,
    "77": <IconBugFix />,
    "78": <IconCanary />,
    "79": <IconTopPercentage />,
    "80": <IconGodObject />,
    "81": <IconCake />,
    "82": <IconRaceCondition />,
};
