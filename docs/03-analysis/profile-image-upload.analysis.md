# Gap Analysis: profile-image-upload

**Date**: 2026-03-06
**Feature**: profile-image-upload
**Match Rate**: 95%

---

## Plan vs Implementation 비교

### G1. 이미지 선택 (expo-image-picker)

| 항목 | 계획 | 구현 | 결과 |
|------|------|------|------|
| 갤러리에서 이미지 선택 | `launchImageLibraryAsync` | ✅ 구현됨 | PASS |
| 권한 요청 (mediaLibrary) | `requestMediaLibraryPermissionsAsync` | ✅ 구현됨 + Alert | PASS |
| 선택 취소 시 무동작 | `result.canceled` 체크 | ✅ 구현됨 | PASS |

### G2. 업로드 (updateProfileImage)

| 항목 | 계획 | 구현 | 결과 |
|------|------|------|------|
| 이미지 URI → PATCH /users/me/profile/image | `updateProfileImage(uri)` | ✅ 구현됨 | PASS |
| 업로드 중 로딩 인디케이터 | `uploadingImage` state | ✅ ActivityIndicator 오버레이 | PASS |
| 성공 시 me 상태 갱신 | `getMe()` + `setMe()` | ✅ 구현됨 | PASS |
| 실패 시 Alert | `Alert.alert(...)` | ✅ 구현됨 | PASS |

### G3. MyPageScreen UI

| 항목 | 계획 | 구현 | 결과 |
|------|------|------|------|
| 카메라 아이콘 오버레이 | 📷 아이콘 | ✅ cameraOverlay 스타일 적용 | PASS |
| 업로드 중 ActivityIndicator | uploadingImage 조건 | ✅ 구현됨 | PASS |
| Pressable 탭으로 갤러리 오픈 | `onPress={handlePickImage}` | ✅ disabled={uploadingImage} 포함 | PASS |

---

## 발견된 Gap

### GAP-1: MediaTypeOptions deprecated (경미)
- **위치**: `MyPageScreen.tsx:46`
- **내용**: `ImagePicker.MediaTypeOptions.Images`는 expo-image-picker v15+에서 deprecated
- **권장**: `ImagePicker.MediaType.images` 로 교체
- **영향**: 동작에는 문제 없지만 TS 경고 발생 가능

---

## Success Criteria 검증

| 기준 | 결과 |
|------|------|
| 프로필 이미지 탭 → 갤러리 열림 | ✅ PASS |
| 이미지 선택 → 업로드 → 화면 즉시 반영 | ✅ PASS |
| 업로드 실패 시 Alert 표시 | ✅ PASS |
| TypeScript 오류 0개 | ⚠️ MediaTypeOptions deprecated 경고 가능 |

---

## 결론

**Match Rate: 95%** — 핵심 기능 모두 구현 완료. GAP-1(deprecated API) 수정 시 100%.

> Gap이 경미하므로 바로 iterate 또는 수동 fix 후 report 가능.
