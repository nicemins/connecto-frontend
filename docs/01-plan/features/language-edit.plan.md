# language-edit — Plan Document

## Executive Summary

| 항목 | 내용 |
|------|------|
| Feature | language-edit |
| 시작일 | 2026-03-08 |
| 담당 | Frontend |
| PDCA 단계 | Plan |

### Value Delivered (4-Perspective)

| 관점 | 내용 |
|------|------|
| Problem | MyPage 언어 카드는 조회만 가능해 사용자가 언어 설정을 변경하려면 앱을 재설치하거나 온보딩을 다시 거쳐야 함 |
| Solution | MyPage 언어 카드에 편집 모드를 추가해 모국어·학습 언어·수준을 인라인으로 수정·삭제할 수 있게 함 |
| Function UX Effect | "편집" 버튼 → 언어 선택 칩 인터랙티브 전환 → 저장/취소로 즉시 반영, 기존 LanguageSetup UI 패턴 재사용 |
| Core Value | 사용자가 언어 교환 목적·수준 변화에 맞게 언어 설정을 자유롭게 유지 → 매칭 품질 향상 |

---

## 1. 기능 개요

### 1.1 배경 및 목적

현재 MyPage의 언어 카드(`MyPageScreen.tsx` lines 252–294)는 언어를 **표시만** 하며 편집 기능이 없다.
사용자가 언어 실력이 늘거나 학습 언어를 바꾸고 싶을 때 변경 수단이 없어 UX 공백이 발생한다.

백엔드 API는 이미 완비되어 있다 (`PUT /users/me/languages`, `DELETE /users/me/languages/{id}`).
프론트엔드 API 함수(`languages.ts`)와 MyPage UI 편집 모드만 추가하면 된다.

### 1.2 범위 (Scope)

**IN:**
- `src/api/languages.ts` — `getLanguages()`, `updateLanguages()`, `deleteLanguage(id)` 추가
- `src/screens/MyPageScreen.tsx` — 언어 카드 편집 모드 (편집/저장/취소)
- 편집 모드: 모국어 선택 칩, 학습 언어 선택 칩, 수준(Level) 선택 칩
- 저장 시 `PUT /users/me/languages` 호출 후 `getMe()` 갱신

**OUT:**
- 별도 화면(Screen) 추가 없음 — 인라인 편집
- 언어 추가(다중) 확장은 포함하지 않음 (1모국어 + 1학습언어 기준 유지)
- 관심사(Interests) 편집은 별개 기능

---

## 2. 요구사항

### 2.1 기능 요구사항

| ID | 요구사항 | 우선순위 |
|----|----------|----------|
| FR-01 | 언어 카드 상단에 "편집" 버튼 표시 | Must |
| FR-02 | 편집 모드 진입 시 현재 언어가 선택된 상태로 칩 UI 표시 | Must |
| FR-03 | 모국어 선택: LANGUAGES 목록에서 단일 선택 | Must |
| FR-04 | 학습 언어 선택: LANGUAGES 목록에서 단일 선택 | Must |
| FR-05 | 학습 수준 선택: BEGINNER / INTERMEDIATE / ADVANCED | Must |
| FR-06 | "저장" 시 `PUT /users/me/languages` 호출 후 getMe() 갱신 | Must |
| FR-07 | "취소" 시 원래 값 복원 | Must |
| FR-08 | 저장 중 로딩 인디케이터 표시 | Must |
| FR-09 | 오류 시 Alert 표시 | Must |

### 2.2 비기능 요구사항

| 항목 | 내용 |
|------|------|
| 스타일 | 기존 MyPage 카드 스타일(다크 글라스모피즘) 유지 |
| 일관성 | LanguageSetupScreen의 chip 스타일(`chipSelected`, `chipText`) 재사용 |
| 타입 안전 | `LanguageType`, `LanguageLevel` 기존 타입 활용 |

---

## 3. API 명세

### 3.1 추가할 API 함수 (`src/api/languages.ts`)

```typescript
// GET /users/me/languages — 언어 목록 조회 (getMe와 별도로 필요 시)
export async function getLanguages(): Promise<LanguageItem[]>

// PUT /users/me/languages — 언어 전체 교체
export async function updateLanguages(languages: LanguageRequest[]): Promise<void>

// DELETE /users/me/languages/{id} — 언어 삭제 (개별 삭제 필요 시)
export async function deleteLanguage(id: number): Promise<void>
```

`LanguageItem` 타입:
```typescript
export type LanguageItem = {
  id: number;
  languageCode: string;
  type: LanguageType;
  level: LanguageLevel;
};
```

### 3.2 PUT /users/me/languages 페이로드

```typescript
// 기존 언어를 모두 교체 (전체 replace)
[
  { languageCode: "ko", type: "NATIVE", level: "NATIVE" },
  { languageCode: "en", type: "LEARNING", level: "INTERMEDIATE" }
]
```

---

## 4. UI 설계

### 4.1 언어 카드 편집 모드 흐름

```
[언어 카드 - 뷰 모드]
  언어 (타이틀)          [편집]
  모국어: KO
  학습 중: EN · INTERMEDIATE

↓ 편집 버튼 탭

[언어 카드 - 편집 모드]
  언어 (타이틀)     [취소] [저장]
  모국어
  [ KO ] [ EN ] [ JA ] [ ZH ] [ ES ] [ FR ] [ DE ]  (선택된 것 강조)
  학습 언어
  [ KO ] [ EN ] [ JA ] ...
  학습 수준
  [ BEGINNER ] [ INTERMEDIATE ] [ ADVANCED ]
```

### 4.2 상태 관리 (MyPageScreen 내)

```typescript
const [langEditing, setLangEditing] = React.useState(false);
const [editNative, setEditNative] = React.useState<string | null>(null);
const [editLearning, setEditLearning] = React.useState<string | null>(null);
const [editLevel, setEditLevel] = React.useState<LanguageLevel>("BEGINNER");
const [langSaving, setLangSaving] = React.useState(false);
```

편집 진입 시 현재 `me.languages`에서 초기값 세팅.

---

## 5. 구현 계획

### 5.1 구현 순서

1. `src/api/languages.ts` — `updateLanguages`, `deleteLanguage` 추가
2. `src/screens/MyPageScreen.tsx`
   - import 추가 (`updateLanguages`, `LanguageLevel` 등)
   - 언어 편집 상태 변수 추가
   - 언어 카드 조건부 렌더링 (뷰 모드 / 편집 모드)
   - `handleLangSave()` 핸들러 구현
3. 동작 확인: 편집 → 선택 → 저장 → 카드 갱신

### 5.2 영향 범위

| 파일 | 변경 유형 |
|------|----------|
| `src/api/languages.ts` | 함수 추가 |
| `src/screens/MyPageScreen.tsx` | 언어 카드 섹션 수정 |

신규 파일 없음. 기존 화면(`LanguageSetupScreen`)은 수정하지 않음.

---

## 6. 완료 기준 (Definition of Done)

- [ ] 언어 카드에 "편집" 버튼이 표시된다
- [ ] 편집 모드에서 현재 언어가 선택된 상태로 칩이 표시된다
- [ ] 모국어 / 학습 언어 / 수준을 변경하고 저장하면 카드에 즉시 반영된다
- [ ] 취소 시 변경사항이 원래대로 복원된다
- [ ] 저장 중 로딩 표시 및 오류 Alert 동작
- [ ] TypeScript 에러 없음
