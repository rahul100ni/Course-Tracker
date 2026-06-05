# 📚 Algorithms Course Tracker

A premium, high-density, highly interactive single-page Course Study Tracker & Stopwatch Application designed for deep focus. 

Built with **React**, **Tailwind CSS v3**, and **Vite**.

![App Preview](https://via.placeholder.com/1000x500.png?text=Course+Tracker+Dashboard)

## ✨ Features

* **Session Focus Hub (The Timer)**: A precise stopwatch to track active, real-time study sessions. Resilient to tab closures and browser refreshes—your elapsed time is securely saved and automatically resumes.
* **Daily Goal Card**: Tracks your daily course consumption against a customizable target (e.g., 4 hours). Displays dynamic color shifts (Indigo → Amber → Emerald) as you approach and meet your goal.
* **Interactive Syllabus**: Collapsible, accordion-style sections containing individual lectures. Ticking off lectures instantly updates your progress globally.
* **Study History Dashboard**: A persistent historical log of your study habits. Review daily time tracked, content consumed, lectures finished, and overall completion percentage.
* **Streak Tracker**: Maintains a streak counter (🔥) for consecutive days you meet your content goal.
* **100% Local Persistence**: All your progress, histories, and timer states are automatically saved directly in your browser's `localStorage`. No accounts, no cloud sync delays, no data loss.
* **Data Portability**: Easily export your entire progress to a JSON backup file and import it back on any other device or browser.

## 🚀 Quick Start (Local Development)

1. **Clone the repository**
   ```bash
   git clone https://github.com/rahul100ni/Course-Tracker.git
   cd Course-Tracker
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the development server**
   ```bash
   npm run dev
   ```

## 🛠️ Build for Production

To create a static production build:

```bash
npm run build
```
The output will be placed in the `dist` folder. Because the project uses `base: './'` in its Vite configuration, you can simply open the built `dist/index.html` file directly in your browser without needing a web server!

## 🌐 Deploying to Vercel

This app is optimized for seamless zero-config deployment on Vercel:
1. Log in to [Vercel](https://vercel.com).
2. Click **Add New → Project**.
3. Import this repository.
4. Leave the Framework Preset as **Vite**.
5. Click **Deploy**.

## 🎨 Design Philosophy

* **Vibe**: Premium, clean, and high-density, inspired by advanced IDEs and top-tier learning platforms.
* **Aesthetics**: Ultra-modern, high-contrast dark mode using deep slate backgrounds coupled with vibrant indigo, emerald, and amber accent colors.
* **UX**: Fast, responsive, and distraction-free to optimize long study sessions.

---
*Built with ❤️ for focused learning.*
