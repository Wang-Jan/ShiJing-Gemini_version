# ShiJing Garden Migration Notes

Date: 2026-03-22

## Summary

This round finalized the project around the in-house Garden model and polished the account settings experience.

1. Removed the old third-party model-oriented implementation and naming.
2. Switched image analysis to a Garden-only backend service.
3. Added password update support under `设置 - 隐私与安全`.
4. Added profile editing support under `设置 - 个人资料`.
5. Removed the duplicated message notification item from settings.
6. Cleaned user-facing Chinese copy and app page details.

## Major Changes

### 1. Garden-only analysis flow

- Removed the former browser-side model service file.
- Added `src/services/gardenService.ts` as the server-side analysis adapter.
- `POST /api/analyze` now reads:
  - `GARDEN_API_KEY`
  - `GARDEN_API_BASE_URL`
- Frontend analysis UI now consistently describes Garden only.

### 2. Account security

- Added `PATCH /api/account/password`.
- Password update requires:
  - current password
  - new password
  - confirm password on the frontend
- Password strength feedback reuses the same rule set as registration:
  - minimum length
  - uppercase bonus
  - digit bonus
  - symbol bonus
- Password changes are written back to MySQL after bcrypt hashing.

### 3. Profile editing

- Added `PATCH /api/account/profile`.
- Users can now update:
  - nickname
  - avatar
- Changes are persisted to MySQL.
- Backend returns updated user info and a refreshed token.

### 4. Settings page cleanup

- Removed the old `消息通知` entry in `设置 - 通用`.
- Kept only:
  - `隐私与安全`
  - `个人资料`
- Updated AI settings wording to reflect the new Garden backend proxy architecture.

### 5. UI text cleanup

- Repaired remaining garbled Chinese text in core pages:
  - `App.tsx`
  - `views/LoginView.tsx`
  - `views/RegisterView.tsx`
  - `views/HomeView.tsx`
  - `views/LiveView.tsx`
  - `views/AIView.tsx`
  - `views/RobotView.tsx`
  - `views/AllActivitiesView.tsx`
  - `views/SettingsView.tsx`
  - `types.ts`

## Environment Variables

The backend now expects:

```env
GARDEN_API_KEY=your_garden_api_key
GARDEN_API_BASE_URL=http://127.0.0.1:8000
SESSION_SECRET=your_session_secret
MYSQL_HOST=127.0.0.1
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=your_mysql_password
MYSQL_DATABASE=shijing
```

## Notes

- The project is now aligned around Garden only.
- Analysis is backend-only and no model key is exposed in the browser.
- Account profile and password updates are synchronized with MySQL.
