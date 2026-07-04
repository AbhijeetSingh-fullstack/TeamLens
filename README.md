<div align="center">
  <img src="https://via.placeholder.com/150" alt="TeamLens Logo" width="120" height="120" />

  # 🎯 TeamLens

  **A modern, real-time team management and communication platform.**
  
  [![React Native](https://img.shields.io/badge/React_Native-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://reactnative.dev/)
  [![Expo](https://img.shields.io/badge/expo-1C1E24?style=for-the-badge&logo=expo&logoColor=#D04A37)](https://expo.dev/)
  [![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com/)
  [![Clerk](https://img.shields.io/badge/Clerk-6C47FF?style=for-the-badge&logo=clerk&logoColor=white)](https://clerk.com/)
  [![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
</div>

---

## 📖 About The Project

**TeamLens** is a powerful cross-platform mobile application built to streamline team collaboration. Whether you are managing complex projects or communicating with team members, TeamLens offers an intuitive, role-based experience tailored for both **Managers** and **Members**.

Built with the latest tools in the React Native ecosystem—Expo Router, NativeWind, Clerk, and Supabase—it guarantees a lightning-fast, secure, and beautiful user experience across iOS, Android, and the Web.

---

## ✨ Key Features

TeamLens utilizes a **role-based architecture** to provide the right tools to the right people:

### 👑 For Managers
- **Project Management:** Oversee ongoing projects, assign tasks, and track deadlines.
- **Advanced Analytics:** Gain insights into team performance and project progression through detailed charts and metrics.
- **Team Oversight:** Manage team structures, invite new members, and control permissions.
- **Direct Messaging:** Communicate with members in real-time.

### 👥 For Members
- **Seamless Onboarding:** Easily join teams via invite links or codes.
- **Task Execution:** View assigned projects and update statuses instantly.
- **Real-time Chat:** Collaborate securely with managers and peers through built-in messaging.

---

## 📱 App Preview

*(Replace the placeholder URLs with actual screenshots of your application)*

| Manager Dashboard | Analytics View | Real-time Chat (Members) | Join Team Flow |
| :---: | :---: | :---: | :---: |
| <img src="https://via.placeholder.com/250x500.png?text=Dashboard+Screen" width="200"/> | <img src="https://via.placeholder.com/250x500.png?text=Analytics+Screen" width="200"/> | <img src="https://via.placeholder.com/250x500.png?text=Chat+Screen" width="200"/> | <img src="https://via.placeholder.com/250x500.png?text=Join+Team+Screen" width="200"/> |
| *High-level overview of projects.* | *Performance and progress metrics.* | *Real-time messaging interface.* | *Frictionless onboarding.* |

---

## 🛠️ Built With

* **[React Native](https://reactnative.dev/)** & **[Expo](https://expo.dev/)** - Core application framework and routing (Expo Router).
* **[Clerk Expo](https://clerk.com/)** - End-to-end identity and user authentication.
* **[Supabase](https://supabase.com/)** - Open-source Firebase alternative used for scalable Postgres database and real-time subscriptions.
* **[NativeWind](https://www.nativewind.dev/) (Tailwind CSS)** - Utility-first styling for consistent UI components.

---

## 🚀 Getting Started

Follow these instructions to get a copy of the project up and running on your local machine.

### Prerequisites

Make sure you have the following installed:
- Node.js (v18 or newer)
- npm, yarn, or pnpm
- [Expo Go](https://expo.dev/client) app on your physical device, or an iOS Simulator / Android Emulator.

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/teamlens.git
   cd teamlens
   ```

2. **Install packages**
   ```bash
   npm install
   ```

3. **Environment Setup**
   Copy the example environment file:
   ```bash
   cp .env.example .env
   ```
   Open `.env` and fill in your keys (Clerk and Supabase are required for the app to function):
   ```env
   EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_key
   EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
   EXPO_PUBLIC_SUPABASE_KEY=your_supabase_anon_key
   ```

4. **Start the application**
   ```bash
   npx expo start
   ```

---

## 📁 Project Structure

```text
TeamLens/
├── src/
│   ├── app/                # Expo Router file-based navigation
│   │   ├── (manager-tabs)/ # Routes accessible only to Managers
│   │   ├── (member-tabs)/  # Routes accessible only to Members
│   │   ├── chat/           # Dynamic chat routes
│   │   └── _layout.tsx     # Global layout and Auth Providers
│   ├── components/         # Reusable UI components
│   ├── hooks/              # Custom React hooks
│   ├── utils/              # Helper functions and configurations
│   └── global.css          # NativeWind/Tailwind global styles
├── .env.example            # Environment variables template
├── tailwind.config.js      # Tailwind CSS configuration
└── package.json            # Project dependencies and scripts
```

---

## 🤝 Contributing

Contributions are what make the open source community such an amazing place to learn, inspire, and create. Any contributions you make are **greatly appreciated**.

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.

<div align="center">
  <b>Built with ❤️ by the TeamLens creators.</b>
</div>
