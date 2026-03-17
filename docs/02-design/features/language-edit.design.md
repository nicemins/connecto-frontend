# language-edit — Design Document

## 1. 변경 파일 목록

| 파일 | 변경 유형 | 설명 |
|------|----------|------|
| `src/api/languages.ts` | 수정 | `updateLanguages`, `deleteLanguage`, `LanguageItem` 타입 추가 |
| `src/screens/MyPageScreen.tsx` | 수정 | 언어 카드 편집 모드 UI + 핸들러 추가 |

---

## 2. API 설계 (`src/api/languages.ts`)

### 추가 타입

```typescript
export type LanguageItem = {
  id: number;
  languageCode: string;
  type: LanguageType;
  level: LanguageLevel;
};
```

### 추가 함수

```typescript
/**
 * 언어 목록 조회
 * GET /users/me/languages
 */
export async function getLanguages(): Promise<LanguageItem[]>

/**
 * 언어 전체 교체 (PUT — replace all)
 * PUT /users/me/languages
 */
export async function updateLanguages(languages: LanguageRequest[]): Promise<void>

/**
 * 언어 삭제
 * DELETE /users/me/languages/{id}
 */
export async function deleteLanguage(id: number): Promise<void>
```

---

## 3. MyPageScreen 상태 설계

### 추가 상태 변수

```typescript
const [langEditing, setLangEditing] = React.useState(false);
const [editNative, setEditNative] = React.useState<string | null>(null);
const [editLearning, setEditLearning] = React.useState<string | null>(null);
const [editLevel, setEditLevel] = React.useState<"BEGINNER" | "INTERMEDIATE" | "ADVANCED">("BEGINNER");
const [langSaving, setLangSaving] = React.useState(false);
```

### 편집 진입 시 초기화

```typescript
const handleLangEditStart = () => {
  const native = nativeLangs[0]?.languageCode ?? null;
  const learning = learningLangs[0]?.languageCode ?? null;
  const level = (learningLangs[0]?.level as "BEGINNER"|"INTERMEDIATE"|"ADVANCED") ?? "BEGINNER";
  setEditNative(native);
  setEditLearning(learning);
  setEditLevel(level);
  setLangEditing(true);
};
```

### 저장 핸들러

```typescript
const handleLangSave = async () => {
  if (!editNative) { Alert.alert("선택 필요", "모국어를 선택해주세요."); return; }
  if (!editLearning) { Alert.alert("선택 필요", "학습 언어를 선택해주세요."); return; }
  setLangSaving(true);
  try {
    await updateLanguages([
      { languageCode: editNative, type: "NATIVE", level: "NATIVE" },
      { languageCode: editLearning, type: "LEARNING", level: editLevel },
    ]);
    const updated = await getMe();
    setMe(updated);
    setLangEditing(false);
  } catch {
    Alert.alert("오류", "언어 설정 저장에 실패했습니다.");
  } finally {
    setLangSaving(false);
  }
};
```

---

## 4. UI 컴포넌트 설계

### 4.1 언어 카드 — 뷰 모드 (기존 유지)

```
┌─────────────────────────────────────┐
│ 언어                          [편집] │
│ 모국어                               │
│  [KO]                                │
│ 학습 중                              │
│  [EN · INTERMEDIATE]                 │
└─────────────────────────────────────┘
```

### 4.2 언어 카드 — 편집 모드

```
┌─────────────────────────────────────┐
│ 언어              [취소]     [저장]  │
│                                      │
│ 모국어                               │
│ [KO] [EN] [JA] [ZH] [ES] [FR] [DE]  │
│                                      │
│ 학습 언어                            │
│ [KO] [EN] [JA] [ZH] [ES] [FR] [DE]  │
│                                      │
│ 학습 수준                            │
│ [BEGINNER] [INTERMEDIATE] [ADVANCED] │
└─────────────────────────────────────┘
```

### 4.3 칩 스타일 (LanguageSetupScreen 동일 패턴 적용)

- 미선택: `borderColor: "rgba(255,255,255,0.2)"`, `backgroundColor: "rgba(255,255,255,0.08)"`
- 선택됨: `borderColor: "#8b5cf6"`, `backgroundColor: "#8b5cf6"`

상수는 MyPageScreen 내에 인라인으로 선언:
```typescript
const LANGUAGES = ["ko", "en", "ja", "zh", "es", "fr", "de"];
const EDIT_LEVELS = ["BEGINNER", "INTERMEDIATE", "ADVANCED"] as const;
```

---

## 5. 데이터 흐름

```
[편집 버튼 탭]
  → handleLangEditStart()
  → me.languages에서 초기값 세팅
  → langEditing = true

[칩 선택]
  → setEditNative / setEditLearning / setEditLevel 업데이트

[저장 탭]
  → handleLangSave()
  → PUT /users/me/languages [{NATIVE}, {LEARNING}]
  → getMe() → setMe(updated)
  → langEditing = false

[취소 탭]
  → langEditing = false (값 복원 불필요, 상태는 재진입 시 재세팅)
```

---

## 6. 완료 기준 체크리스트

- [ ] `languages.ts`: `LanguageItem`, `updateLanguages`, `deleteLanguage` 추가
- [ ] `MyPageScreen`: 언어 편집 상태 변수 4개 추가
- [ ] `MyPageScreen`: `handleLangEditStart`, `handleLangSave` 핸들러 구현
- [ ] 언어 카드 헤더에 "편집" / "취소"+"저장" 조건부 렌더링
- [ ] 편집 모드: 모국어 칩, 학습 언어 칩, 수준 칩 렌더링
- [ ] 저장 중 `ActivityIndicator` 표시
- [ ] TypeScript 오류 없음
