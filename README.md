# Project Structure

This project follows a scalable React Native folder structure:

```
root/
  ├── android/           # Native Android code
  ├── ios/               # Native iOS code
  ├── app/               # App entry point and root navigation/layout
  ├── assets/            # Images, fonts, and other static assets
  ├── components/        # Reusable UI components
  ├── constants/         # App-wide constants, theme, config
  ├── hooks/             # Custom React hooks
  ├── navigation/        # Navigation configuration
  ├── screens/           # App screens (feature pages)
  ├── services/          # API calls, business logic, data fetching
  ├── store/             # State management (Redux, Zustand, etc.)
  ├── tasks/             # Background tasks, scheduled jobs
  ├── types/             # TypeScript types/interfaces
  ├── utils/             # Utility functions/helpers
  └── ...
```

- **app/**: Entry point, root navigation, and layout wrappers.
- **assets/**: Images, fonts, and static files.
- **components/**: Reusable UI components.
- **constants/**: App-wide constants, theme, and config files.
- **hooks/**: Custom React hooks.
- **navigation/**: Navigation configuration and helpers.
- **screens/**: Main app screens/pages.
- **services/**: API, business logic, and data fetching.
- **store/**: State management logic.
- **tasks/**: Background and scheduled tasks.
- **types/**: TypeScript types and interfaces.
- **utils/**: Utility/helper functions.
