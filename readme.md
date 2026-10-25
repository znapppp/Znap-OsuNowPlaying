# Znap-OsuNowPlaying

Minimalist, cute & clean **Now Playing** text overlay for **osu!**, compatible with **tosu** and **GitHub Pages**.

<a href="https://github.com/znapppp/Znap-OsuNowPlaying" target="_blank"><img height="35" src="https://img.shields.io/badge/github-000000?style=for-the-badge&logo=github&logoColor=white" /></a>

| Property | Details |
| --- | --- |
| **Usage** | OBS Browser Source / In-game Overlay |
| **Compatible with** | tosu |
| **Recommended Size** | `800 x 160` (or any size you prefer) |

## ✨ Features
- **Pure Minimalist Text**: Clean typography with no bulky boxes—just Song Title, Artist, and `[Difficulty]`.
- **Cute Rounded Fonts**: Supports English, Japanese, Korean, and Thai (`Quicksand`, `M PLUS Rounded 1c`, `Mali`, `Nunito`).
- **Silky-Smooth Transitions**: Soft blur + vertical float fade-out/fade-in when switching songs.
- **Smart Auto-Marquee**: Gently scrolls back and forth only when a song title is longer than the max width.
- **Dual Mode**: Works locally inside `tosu/static/Znap-OsuNowPlaying` **or** directly via **GitHub Pages URL** in OBS!

---

## 🚀 How to Use in OBS

### Option 1: Via GitHub Pages URL (No files needed in OBS)
Enable **GitHub Pages** in your repository settings (`Settings` -> `Pages` -> Branch: `main`), then paste your GitHub Pages URL into an **OBS Browser Source**:

```text
https://znapppp.github.io/Znap-OsuNowPlaying/
```

You can also customize settings directly via URL parameters:
- `?align=center` (`center` | `left` | `right`)
- `?layout=stacked` (`stacked` | `single`)
- `?diff=1` (`1` = show `[Difficulty]`, `0` = hide)
- `?unicode=0` (`0` = Romanized English, `1` = Original Japanese/Unicode)
- `?font=rounded` (`rounded` | `mali` | `bubble`)
- `?tsize=26&ssize=17` (Title & Subtitle font sizes in px)
- `?shadow=soft` (`soft` | `strong` | `pastel` | `none`)
- `?gameplay=0` (`1` = show only during gameplay, `0` = always show)

**Example URL:**
```text
https://znapppp.github.io/Znap-OsuNowPlaying/?align=center&diff=1&unicode=0&font=rounded
```

### Option 2: Via Local Tosu Server
```text
http://127.0.0.1:24050/Znap-OsuNowPlaying/
```
When using the local Tosu URL, you can customize all options live from the **Tosu Dashboard Settings**!
