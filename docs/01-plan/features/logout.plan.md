# Plan: logout

## Overview
MyPageScreen에 로그아웃 버튼 추가 — 토큰 삭제 + Login 화면 이동

## Background
- `logout()`: authStore에 이미 구현됨 (async, SecureStore 삭제 + state 초기화)
- `POST /auth/logout`: auth.ts에 구현됨
- 현재 MyPageScreen에 로그아웃 진입점 없음

## Goals

### G1. 로그아웃 버튼 UI
- MyPageScreen 하단에 "로그아웃" 버튼 배치
- 탭 시 확인 Alert("로그아웃 하시겠어요?") → 확인/취소

### G2. 로그아웃 로직
- `POST /auth/logout` 호출 (실패해도 계속 진행)
- `logout()` 호출 (SecureStore + Zustand 초기화)
- `navigation.replace("Login")` 으로 이동

### G3. 회원 탈퇴 버튼 (보너스)
- "회원 탈퇴" 텍스트 버튼 추가 (연한 색상)
- 확인 Alert → `DELETE /users/me` → logout() → Login

## Scope
- `src/screens/MyPageScreen.tsx`
- `src/api/auth.ts` (logout 함수 확인)

## Out of Scope
- 소셜 로그인 세션 해제 (Google 등)

## Success Criteria
- 로그아웃 버튼 탭 → 확인 Alert → Login 화면 이동
- SecureStore 토큰 삭제 확인
- 로그아웃 후 뒤로가기 불가 (replace 사용)
- TypeScript 0 errors
