# Gap Analysis — chat-image

> **분석일**: 2026-03-25
> **Design**: `docs/02-design/features/chat-image.design.md`
> **Overall Match Rate**: 100% (30/30)

---

## Executive Summary

| 항목 | 결과 |
|------|------|
| 전체 체크 항목 | 30 |
| 일치 항목 | 30 |
| 불일치 항목 | 0 |
| Match Rate | **100%** |
| 상태 | ✅ 완료 |

---

## 1. `src/api/chat.ts` — ChatMessage 타입 확장

| # | 체크 항목 | 결과 |
|---|----------|------|
| 1 | `imageUrl?: string \| null` 필드 추가 | ✅ |
| 2 | `messageType?: "TEXT" \| "IMAGE"` 필드 추가 | ✅ |
| 3 | `content: string \| null` (null 허용) | ✅ |

## 2. `src/api/chat.ts` — sendChatImage 함수

| # | 체크 항목 | 결과 |
|---|----------|------|
| 4 | `sendChatImage(roomId, uri)` 함수 존재 | ✅ |
| 5 | `POST /chat/rooms/{roomId}/messages/image` 호출 | ✅ |
| 6 | `multipart/form-data` Content-Type 헤더 | ✅ |
| 7 | FormData part name: `"image"` | ✅ |
| 8 | MIME 타입 자동 감지 (jpeg/png/webp) | ✅ |
| 9 | `ChatMessage` 반환 타입 | ✅ |

## 3. `src/screens/ChatScreen.tsx` — 신규 state/ref

| # | 체크 항목 | 결과 |
|---|----------|------|
| 10 | `isImageSending` state (boolean) | ✅ |
| 11 | `isImageSendingRef` ref (boolean, 중복 전송 방지) | ✅ |

## 4. `src/screens/ChatScreen.tsx` — handleSendImage 흐름

| # | 체크 항목 | 결과 |
|---|----------|------|
| 12 | `ImagePicker.launchImageLibraryAsync` 호출 | ✅ |
| 13 | 취소 시 early return | ✅ |
| 14 | 5MB 초과 시 Alert | ✅ |
| 15 | temp 메시지 (id: `-(Date.now())`, imageUrl: localUri) 추가 | ✅ |
| 16 | `setIsImageSending(true)` + `isImageSendingRef.current = true` | ✅ |
| 17 | `sendChatImage` 호출 | ✅ |
| 18 | 성공: temp를 confirmed로 교체 (id·imageUrl·createdAt 업데이트) | ✅ |
| 19 | 실패: temp 제거 + Alert | ✅ |
| 20 | finally: `setIsImageSending(false)` + ref 해제 | ✅ |

## 5. `src/screens/ChatScreen.tsx` — renderMessage 이미지 분기

| # | 체크 항목 | 결과 |
|---|----------|------|
| 21 | `messageType === "IMAGE" \|\| !!imageUrl` 조건 분기 | ✅ |
| 22 | `<Image>` 컴포넌트 사용 (200×150 또는 유사 크기) | ✅ |
| 23 | isPending 시 `ActivityIndicator` overlay | ✅ |
| 24 | isPending 시 시간 표시: `"전송 중..."` | ✅ |
| 25 | 일반 텍스트는 기존 Text 버블 유지 | ✅ |

## 6. `src/screens/ChatScreen.tsx` — 소켓 echo dedup

| # | 체크 항목 | 결과 |
|---|----------|------|
| 26 | `handleReceive`에서 `prev.some(m => m.id === msg.id)` 체크 | ✅ |
| 27 | 중복 id 시 skip (prev 그대로 반환) | ✅ |

## 7. `src/screens/ChatScreen.tsx` — UI 변경

| # | 체크 항목 | 결과 |
|---|----------|------|
| 28 | 입력창 Row에 📷 버튼 추가 | ✅ |
| 29 | 이미지 전송 중 / 텍스트 전송 중 → 📷 버튼 disabled | ✅ |
| 30 | `expo-image-picker` import 사용 | ✅ |

---

## 마이너 불일치 (수정 불필요)

| 항목 | 설계 | 구현 | 판정 |
|------|------|------|------|
| 이미지 크기 제한 | Design: 5MB | Plan: 10MB (오기) → 구현: 5MB | ✅ 구현이 정확, Plan 문서 수정 완료 |
| 이미지 크기 (px) | 200×150 | 실제 스타일 유사 | ✅ |

---

## 결론

chat-image 기능이 설계서와 100% 일치하여 구현되었습니다.
`/pdca report chat-image`로 완료 보고서를 생성할 수 있습니다.
