# Plan: ui-ux-improvements

**작성일**: 2026-04-05 (retroactive)
**Phase**: Do 완료 → Check 진행

## Executive Summary

| 관점 | 내용 |
|------|------|
| Problem | 기능은 완성됐으나 화면 전반에 생동감·정보성이 부족해 앱 완성도가 낮음 |
| Solution | 애니메이션·상태 배지·언어 표시 개선으로 시각적 피드백 강화 |
| UX Effect | 사용자가 현재 상태(온라인·미읽·대기시간)를 직관적으로 파악 |
| Core Value | "첫인상부터 살아있는 앱" — 매칭·통화·채팅 각 단계의 몰입감 향상 |

## Context Anchor

| 항목 | 내용 |
|------|------|
| WHY | 기능 완성 후 UX 완성도 향상 단계 |
| WHO | 신규 유저 (첫인상), 기존 유저 (반복 사용 편의) |
| RISK | 과도한 애니메이션으로 성능 저하 가능 — useNativeDriver: true 필수 |
| SUCCESS | 각 스크린에 지정 애니메이션·배지 정상 동작 |
| SCOPE | 8개 스크린 + NavigationTabBar + authStore |

## Goals

### G1. 언어 표시 개선
- HomeScreen: 모국어 → 학습어 국기 배지 (화살표 연결)
- MyPageScreen: 언어 카드에 국기 이모지 적용

### G2. 통화·매칭 애니메이션
- CallScreen: WaveBars 6개 막대 독립 주기 애니메이션 (음성 활동 시각화)
- MatchingScreen: 대기 경과 타이머 + 점 로딩 애니메이션 + 한국어 텍스트

### G3. 프로필·로그인 플로팅
- HomeScreen: 아바타 위아래 플로팅 (translateY loop)
- LoginScreen: CharacterBlob 플로팅
- HomeScreen: Find Partner 버튼 pulse scale

### G4. 결과 화면 애니메이션
- MatchResultScreen: spring 입장 애니메이션 (opacity + translateY + scale)
- MatchResultScreen: 친구 성사 시 셀레브레이션 bounce

### G5. 상태 표시 개선
- FriendListScreen: 헤더 온라인 인원 배지 + 온라인 친구 카드 보라색 하이라이트
- ChatListScreen: 헤더 총 미읽 배지

### G6. 탭바 미읽 배지
- ChatList 탭 아이콘에 totalUnreadCount 배지 표시
- authStore에 totalUnreadCount 전역 상태 추가
- ChatListScreen → authStore 동기화

## Scope

| 파일 | 변경 유형 |
|------|-----------|
| `src/screens/HomeScreen.tsx` | 수정 |
| `src/screens/LoginScreen.tsx` | 수정 |
| `src/screens/CallScreen.tsx` | 수정 |
| `src/screens/MatchingScreen.tsx` | 수정 |
| `src/screens/MatchResultScreen.tsx` | 수정 |
| `src/screens/FriendListScreen.tsx` | 수정 |
| `src/screens/ChatListScreen.tsx` | 수정 |
| `src/screens/MyPageScreen.tsx` | 수정 |
| `src/store/authStore.ts` | 수정 |
| `src/navigation/MainTabNavigator.tsx` | 수정 |

## Success Criteria

- SC-1: HomeScreen 아바타 플로팅 + Find Partner pulse 애니메이션 동작
- SC-2: LoginScreen CharacterBlob 플로팅 동작
- SC-3: CallScreen WaveBars 6개 막대 독립 애니메이션 동작
- SC-4: MatchingScreen 경과 타이머 + 점 애니메이션 동작
- SC-5: MatchResultScreen 입장 spring + mutual 셀레브레이션 bounce 동작
- SC-6: FriendListScreen 헤더 온라인 인원 배지 표시
- SC-7: FriendListScreen 온라인 친구 카드 보라색 하이라이트
- SC-8: ChatListScreen 헤더 총 미읽 배지 표시
- SC-9: HomeScreen + MyPageScreen 국기 이모지 언어 배지 표시
- SC-10: ChatList 탭 아이콘 미읽 배지 (authStore 동기화)
- SC-11: 모든 애니메이션 `useNativeDriver: true` 사용 (성능)
