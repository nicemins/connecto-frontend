# Design: ui-ux-improvements

**작성일**: 2026-04-05 (retroactive)
**Plan 참조**: `docs/01-plan/features/ui-ux-improvements.plan.md`

## Context Anchor

| 항목 | 내용 |
|------|------|
| WHY | 기능 완성 후 UX 완성도 향상 단계 |
| WHO | 신규·기존 유저 전체 |
| RISK | 과도한 애니메이션 → useNativeDriver: true 필수 |
| SUCCESS | 11개 SC 전부 충족 |
| SCOPE | 8개 스크린 + authStore + MainTabNavigator |

## 1. Architecture

선택 Option: **Pragmatic Balance** — 각 스크린에 로컬 Animated.Value, 공유 상태만 authStore로 전달

## 2. 상세 설계

### G1. 언어 배지 (HomeScreen, MyPageScreen)

```
langFlag: Record<string, string> = { ko:"🇰🇷", en:"🇺🇸", ja:"🇯🇵", zh:"🇨🇳", es:"🇪🇸", fr:"🇫🇷", de:"🇩🇪" }
```
- HomeScreen: `nativeLang → learningLang` 화살표 연결 배지
- MyPageScreen: 언어 카드 내 이모지 + 텍스트

### G2. WaveBars (CallScreen)

```
WAVE_COUNT = 6
MY_WAVE_CONFIG / PARTNER_WAVE_CONFIG: { maxH, duration }[]
WaveBars({ config, color, active }): Animated.loop(sequence([toValue:1, toValue:0.1]))
active=false → 미세 진폭, active=true → 정상 진폭
```

### G3. MatchingScreen 타이머

```
elapsed: number (setInterval 1초)
formatElapsed(s): "N초 대기 중" | "N분 N초 대기 중"
dots: "" | "." | ".." | "..." (500ms toggle)
```

### G4. 플로팅 애니메이션 (HomeScreen, LoginScreen)

```
floatAnim: Animated.Value(0)
loop(sequence([toValue:-10, toValue:0]), duration:2000~2200)
useNativeDriver: true
transform: [{ translateY: floatAnim }]
```

### G5. HomeScreen Find Partner Pulse

```
pulseAnim: Animated.Value(1)
loop(sequence([toValue:1.05, toValue:1]), duration:1000)
useNativeDriver: true
transform: [{ scale: pulseAnim }]
```

### G6. MatchResultScreen 입장 애니메이션

```
enterAnim: Animated.Value(0)
spring(toValue:1, tension:55, friction:9)
opacity: enterAnim
translateY: interpolate(inputRange:[0,1], outputRange:[40,0])
scale: interpolate(inputRange:[0,1], outputRange:[0.92,1])
```

### G7. MatchResultScreen 셀레브레이션

```
celebAnim: Animated.Value(1)
trigger: friendRequestStatus === "mutual"
sequence([timing(toValue:1.18, 180ms), spring(toValue:1)])
wrap mutual friend banner Animated.View
```

### G8. FriendListScreen 상태 배지

```
onlineCount = friends.filter(f => onlineStatusMap[f.userId]).length
헤더: onlineCount > 0 → 초록 배지 "N명 온라인"
카드: isOnline → styles.friendCardOnline (보라 border + 배경)
```

### G9. ChatListScreen 헤더 미읽 배지

```
totalUnread = chatRooms.reduce((sum,r) => sum + (r.unreadCount ?? 0), 0)
헤더 "채팅" 옆 보라 뱃지
```

### G10. 탭바 ChatList 배지 (authStore 연동)

```
authStore: totalUnreadCount: number, setTotalUnreadCount(count)
ChatListScreen: useEffect([chatRooms]) → setTotalUnreadCount(total)
logout(): totalUnreadCount: 0 reset
MainTabNavigator: totalUnreadCount = useAuthStore(s => s.totalUnreadCount)
TabIcon badge={totalUnreadCount}
```

## 3. 파일별 변경 명세

| 파일 | 변경 내용 |
|------|-----------|
| `HomeScreen.tsx` | langFlag, floatAnim, pulseAnim, Animated.View 래핑 |
| `LoginScreen.tsx` | floatAnim, CharacterBlob Animated.View 래핑 |
| `CallScreen.tsx` | WaveBars 컴포넌트, MY/PARTNER_WAVE_CONFIG |
| `MatchingScreen.tsx` | elapsed state, dots state, 한국어 텍스트 |
| `MatchResultScreen.tsx` | enterAnim, celebAnim, Animated.View 래핑 |
| `FriendListScreen.tsx` | onlineCount 헤더 배지, friendCard/friendCardOnline 스타일 |
| `ChatListScreen.tsx` | 헤더 미읽 배지, setTotalUnreadCount useEffect |
| `MyPageScreen.tsx` | LANG_FLAGS, 언어 카드 이모지 |
| `authStore.ts` | totalUnreadCount, setTotalUnreadCount, logout reset |
| `MainTabNavigator.tsx` | totalUnreadCount 구독, ChatList badge 전달 |
