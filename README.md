# TeamLens 🎯

TeamLens is a modern, cross-platform mobile application built with React Native and Expo. It leverages powerful tools like Clerk for authentication, Supabase for backend services, and NativeWind for beautiful, responsive styling.

## 🌟 Features

- **Cross-Platform:** Runs seamlessly on iOS, Android, and Web.
- **Secure Authentication:** Powered by [Clerk](https://clerk.com/) for a robust and secure sign-in/sign-up experience.
- **Modern UI:** Styled using [NativeWind](https://www.nativewind.dev/) (Tailwind CSS for React Native) to ensure a clean and responsive design.
- **Backend as a Service:** Integrated with [Supabase](https://supabase.com/) for scalable database and backend functionalities.

## 🛠️ Tech Stack

- **Framework:** [React Native](https://reactnative.dev/) & [Expo](https://expo.dev/) (Expo Router)
- **Styling:** [NativeWind](https://www.nativewind.dev/) v4 & Tailwind CSS
- **Authentication:** [Clerk Expo](https://clerk.com/docs/quickstarts/expo)
- **Database:** [Supabase](https://supabase.com/)

## 🚀 Getting Started

### Prerequisites

- Node.js (v18 or newer recommended)
- npm, yarn, pnpm, or bun
- [Expo CLI](https://docs.expo.dev/get-started/installation/)

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/your-username/teamlens.git
   cd teamlens
   ```

2. **Install dependencies:**
   ```bash
   npm install
   # or
   yarn install
   ```

### ⚙️ Configuration

The project requires some environment variables to function correctly, particularly for authentication. 

1. Create a copy of the `.env.example` file and name it `.env`:
   ```bash
   cp .env.example .env
   ```
2. Open the newly created `.env` file and replace the placeholder values with your actual API keys (e.g., your Clerk Publishable Key).

> **Note:** Never commit your `.env` file to version control.

### 🏃‍♂️ Running the App

Start the Expo development server:

```bash
npm start
# or
yarn start
```

Press `a` to open on Android, `i` to open on iOS, or `w` to open on the web.

## 📄 License

This project is licensed under the MIT License.
