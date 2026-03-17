# Plan: partner-profile

## Executive Summary

| 관점 | 내용 |
|------|------|
| **Problem** | 통화 후 친구 연결이 되었을 때 "프로필 보기" 버튼이 "준비 중" Alert만 표시하여 상대방 정보를 확인할 수 없음 |
| **Solution** | MatchResultScreen 내 Modal로 상대방 프로필(닉네임·소개·이미지)을 표시 — 이미 로드된 데이터를 재사용하므로 추가 API 호출 불필요 |
| **Function UX Effect** | 친구 연결 직후 상대방 프로필을 바로 확인 가능 → 친구 관계 신뢰도 및 재방문 동기 향상 |
| **Core Value** | 백엔드 변경 없이 프론트 단 구현 완료, 기존 데이터 재사용으로 최소 코드로 최대 UX 개선 |

---

## 1. 기능 정의

### 1.1 개요

MatchResultScreen에서 친구 연결(`friendRequestStatus === "mutual"`)이 완료된 경우, "프로필 보기" 버튼 탭 시 상대방 프로필을 Modal로 표시.

현재 `partnerProfile` state에 이미 `{ profile: { id, nickname, profileImageUrl?, bio? } }` 데이터가 로드되어 있으므로, **추가 API 호출 없이** Modal만 구현하면 됨.

### 1.2 현재 vs 목표

| 항목 | 현재 (버그) | 목표 |
|------|------------|------|
| "프로필 보기" 버튼 동작 | `Alert.alert("알림", "프로필 기능은 준비 중입니다.")` | Modal 오픈 |
| 상대방 정보 표시 | 없음 | 닉네임, 소개(bio), 프로필 이미지 |
| 구현 위치 | - | MatchResultScreen 내 인라인 Modal |
| 백엔드 추가 작업 | - | 없음 (데이터 이미 로드됨) |

### 1.3 표시 데이터

`getMatchResult(sessionId)` 응답으로 이미 받은 데이터:
```ts
partnerProfile.profile = {
  id: number,
  nickname: string,
  profileImageUrl?: string,  // 없으면 기본 캐릭터 블롭
  bio?: string,              // 없으면 "소개가 없습니다"
}
```

---

## 2. 구현 범위 (Scope)

### In Scope

| 번호 | 항목 | 파일 |
|------|------|------|
| P-1 | PartnerProfileModal 컴포넌트 구현 | `src/screens/MatchResultScreen.tsx` (인라인) |
| P-2 | "프로필 보기" 버튼 핸들러 → Modal 오픈으로 교체 | `src/screens/MatchResultScreen.tsx:241` |
| P-3 | Modal 내 프로필 이미지 (없으면 CharacterBlob) | MatchResultScreen 내 |
| P-4 | Modal 내 닉네임, bio 표시 | MatchResultScreen 내 |

### Out of Scope

- 별도 `PartnerProfileScreen` 네비게이션 화면 (Modal로 충분)
- FriendListScreen 프로필 보기 (이미 FriendDetail 모달 구현됨)
- 상대방 프로필 편집 (내 프로필만 편집 가능)
- 프로필 신고 기능 추가 (신고는 기존 버튼으로 처리)

---

## 3. 기술 스펙

### 3.1 Modal 구현

React Native `Modal` 컴포넌트 사용 (별도 라이브러리 불필요):

```tsx
import { Modal } from "react-native";

// State
const [showProfileModal, setShowProfileModal] = React.useState(false);

// 버튼 핸들러
onPress={() => setShowProfileModal(true)}

// Modal
<Modal
  visible={showProfileModal}
  transparent
  animationType="slide"
  onRequestClose={() => setShowProfileModal(false)}
>
  {/* 반투명 배경 + 하단 카드 */}
</Modal>
```

### 3.2 프로필 이미지 처리

```tsx
// profileImageUrl 있으면 Image, 없으면 CharacterBlob
{partnerProfile?.profile?.profileImageUrl ? (
  <Image source={{ uri: partnerProfile.profile.profileImageUrl }} />
) : (
  <CharacterBlob size={80} colors={["#60A5FA", "#3B82F6", "#8B5CF6"]} />
)}
```

### 3.3 디자인 방향

- FriendListScreen의 FriendDetail 모달 스타일 참고 (다크 테마, 반투명 오버레이)
- 앱 기본 색상: 퍼플/블루 계열
- 하단 슬라이드 또는 중앙 카드 스타일

---

## 4. 구현 순서

```
1. MatchResultScreen.tsx
   - showProfileModal state 추가
   - "프로필 보기" onPress → setShowProfileModal(true)
   - PartnerProfileModal JSX 추가 (파일 하단)
```

변경 파일: `src/screens/MatchResultScreen.tsx` 1개

---

## 5. 테스트 시나리오

| 시나리오 | 기대 결과 |
|---------|---------|
| 친구 연결 후 "프로필 보기" 탭 | 상대방 프로필 Modal 표시 |
| 프로필 이미지 있는 경우 | 이미지 표시 |
| 프로필 이미지 없는 경우 | CharacterBlob 표시 |
| bio 없는 경우 | "소개가 없습니다" 표시 |
| Modal 닫기 (배경 탭 또는 닫기 버튼) | Modal 닫힘 |

---

## 6. 의존성

- `React Native Modal` — 기본 내장, 추가 패키지 없음
- `CharacterBlob` — `src/components/CharacterBlob.tsx` 이미 사용 중
- 백엔드 API — 변경 없음

---

> **작성일:** 2026-03-10
> **다음 단계:** `/pdca design partner-profile`
