# Znap-OsuNowPlaying

Minimalist and clean **Now Playing** text overlay for **osu!**, compatible with **tosu** and **GitHub Pages**.

<a href="https://github.com/znapppp/Znap-OsuNowPlaying" target="_blank"><img height="35" src="https://img.shields.io/badge/github-000000?style=for-the-badge&logo=github&logoColor=white" /></a>

| Property | Details |
| --- | --- |
| **Usage** | OBS Browser Source / In-game Overlay |
| **Compatible with** | tosu |
| **Recommended Size** | `800 x 160` |

## Features
- **Pure Minimalist Typography**: Clean text layout displaying `NOW PLAYING`, Song Title, Artist, and `[Difficulty]` with no background boxes or clutter.
- **Rounded Fonts**: Supports English, Japanese, Korean, and Thai (`Quicksand`, `M PLUS Rounded 1c`, `Mali`, `Nunito`).
- **Smooth Transitions**: Soft blur and vertical float fade transition when switching songs.
- **Smart Auto-Marquee**: Gently scrolls back and forth only when the song title exceeds the maximum width.
- **Dual Mode**: Works locally inside `tosu/static/Znap-OsuNowPlaying` or directly via **GitHub Pages URL** in OBS.

---

## How to Use in OBS

### Option 1: Via GitHub Pages URL
Enable **GitHub Pages** in the repository settings (`Settings` -> `Pages` -> Branch: `main`), then paste the URL into an **OBS Browser Source**:

```text
https://znapppp.github.io/Znap-OsuNowPlaying/
```

Optional URL parameters for customization:
- `?label=1` (`1` = show `NOW PLAYING` header, `0` = hide)
- `?labeltext=Now%20Playing` (custom header text)
- `?align=center` (`center` | `left` | `right`)
- `?layout=stacked` (`stacked` | `single`)
- `?diff=1` (`1` = show `[Difficulty]`, `0` = hide)
- `?unicode=0` (`0` = Romanized English, `1` = Original Unicode)
- `?font=rounded` (`rounded` | `mali` | `bubble`)
- `?tsize=26&ssize=17` (Title and Subtitle font sizes in px)
- `?shadow=soft` (`soft` | `strong` | `pastel` | `none`)
- `?maxw=720` (Max text width in px before auto-scrolling)
- `?gameplay=0` (`1` = show only during gameplay, `0` = always show)

**Example URL:**
```text
https://znapppp.github.io/Znap-OsuNowPlaying/?align=center&diff=1&unicode=0&font=rounded
```

### Option 2: Via Local Tosu Server
```text
http://127.0.0.1:24050/Znap-OsuNowPlaying/
```
When using the local Tosu URL, all options can be customized live from the **Tosu Dashboard Settings**.
