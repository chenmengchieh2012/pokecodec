# PokeCodec 🎮

Gamify your VS Code experience! Encounter, battle, and catch Pokemon while you code.

![Pokemon](https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/poke-ball.png)

**PokeCodec** turns your development environment into a Pokemon adventure. Your codebase becomes the world map, and your coding activity fuels your journey!

## ✨ Features

- **🗺️ Explore Biomes**: Your project structure determines the environment. Different folders and file depths represent different biomes (Grassland, Cave, Forest, etc.).
- **🌿 Wild Encounters**: Encounter wild Pokemon as you navigate through your code and switch active files.
- **⚔️ Turn-Based Battles**: Battle wild Pokemon using your party. Features a combat system with type effectiveness (Gen 6+ standard).
- **🔴 Catch 'Em All**: Weaken wild Pokemon and use various Pokeballs to catch them.
- **📊 Coding Stats**: Your Pokemon grow with you! They track your coding achievements:
  - Lines of Code written
  - Bugs fixed
  - Commits made
  - Coffee consumed ☕
- **🔄 Cross-Device Sync**: Seamlessly transfer your Pokemon Party and PC Box between devices using QR Codes and Gist.
- **🎒 Inventory Management**:
  - **Party**: Manage your active team of up to 6 Pokemon.
  - **PC Box**: Store and organize your caught Pokemon collection.
  - **Bag**: Carry items like Potions, Revives, and Pokeballs.
- **🏪 Shop**: Earn money and buy supplies to aid your adventure.

## 🚀 Getting Started

1. **Install** the PokeCodec extension.
2. Open the **Pokemon Game** view in the bottom panel (or run command `Pokemon: Open Pokemon React Panel`) to see the main game screen.
3. Click the **Pokemon Tools** icon (Heart icon) in the Activity Bar to access your:
   - 🎒 Backpack
   - 📦 Pokemon Box
   - 🏪 Shop
4. **Start Coding!** Navigate through your files. The deeper you go into your folder structure, the more dangerous (and rare) the Pokemon become!

## ⚙️ Configuration

You can configure PokeCodec in your VS Code settings (`settings.json`):

| Setting | Description |
| :--- | :--- |
| `pokecodec.gitRootPath` | Manually specify the Git root path. If empty, it will be auto-detected. |
| `pokecodec.gistUrl` | Base URL for Gist raw content. Used for downloading shared Party/Box data. |
| `pokecodec.httpProxy` | HTTP Proxy URL (e.g., `http://127.0.0.1:7890`). Useful for corporate networks. |

## ⌨️ Commands

Access these commands via the Command Palette (`Ctrl+Shift+P` or `Cmd+Shift+P`):

- `Pokemon: Open Pokemon React Panel`: Opens the main game interface.
- `Pokemon: Trigger Encounter`: Manually triggers a wild Pokemon encounter (useful for testing).
- `Pokemon: Bind Device`: Generate a QR code to bind a new device or sync data.
- `Pokemon: Import Bind Code`: Import a bind code string (starting with `GZIP:`) to sync data.
- `Pokemon: Download and Import Party`: Download party data from a configured Gist URL.
- `Pokemon: Download and Import Box`: Download PC Box data from a configured Gist URL.
- `Pokemon: Reset Storage`: **WARNING** - Resets all your game progress.

## 🛠️ Development

This project is built using **VS Code Extension API**, **React**, and **Vite**.

### Prerequisites
- Node.js
- NPM

### Setup
1. Clone the repository.
2. Install dependencies for both the extension and the webview:
   ```bash
   npm run install:all
   ```
3. Download necessary game data and sprites:
   ```bash
   npm run download-data
   npm run download-sprites
   ```
4. Compile the webview:
   ```bash
   npm run build:webview
   ```
5. Press `F5` in VS Code to start debugging.

## 📝 License

This project is licensed under the [MIT License](LICENSE).

*Disclaimer: This is a fan-made project and is not affiliated with, endorsed, sponsored, or specifically approved by Nintendo, Game Freak, or The Pokémon Company. Pokémon and Pokémon character names are trademarks of Nintendo.*

