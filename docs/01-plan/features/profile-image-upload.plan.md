# Plan: profile-image-upload

## Overview
MyPageScreen에서 프로필 이미지를 선택하고 AWS S3에 업로드하는 기능 구현

## Background
- 백엔드: `PATCH /users/me/profile/image` (multipart/form-data) — 구현 중
- 프론트: `updateProfileImage(imageUri)` 함수 이미 `profile.ts`에 준비됨
- `expo-image-picker` 패키지 이미 설치됨 (v17.0.10)

## Goals

### G1. 이미지 선택 (expo-image-picker)
- 갤러리에서 이미지 선택
- 권한 요청 처리 (mediaLibrary)
- 선택 취소 시 아무것도 안 함

### G2. 업로드 (updateProfileImage)
- 선택된 이미지 URI → `PATCH /users/me/profile/image` (multipart/form-data)
- 업로드 중 로딩 인디케이터 표시
- 성공 시 `me` 상태 갱신 (getMe() 재호출)
- 실패 시 Alert 표시

### G3. MyPageScreen UI
- 프로필 이미지 영역에 카메라 아이콘 오버레이 (편집 진입점)
- 업로드 중 이미지 위에 ActivityIndicator 오버레이

## Scope
- `src/screens/MyPageScreen.tsx`
- `src/api/profile.ts` (변경 없음, 이미 구현됨)

## Out of Scope
- 카메라 촬영 (갤러리만)
- 이미지 크롭/편집
- 이미지 압축

## Success Criteria
- 프로필 이미지 탭 → 갤러리 열림
- 이미지 선택 → 업로드 → 화면 즉시 반영
- 업로드 실패 시 Alert 표시
- TypeScript 0 errors
