# Connecto

> **"지금, 누군가와 5분만 이야기해요."**
> *"Talk to someone for just 5 minutes, right now."*
> *「今、誰かと5分だけ話しましょう。」*

<p align="center">
  <img src="assets/icon.png" width="120" alt="Connecto Logo" />
</p>

<p align="center">
  <img src="https://img.shields.io/badge/React_Native-0.81.5-61DAFB?style=flat-square&logo=react" />
  <img src="https://img.shields.io/badge/Expo-54-000020?style=flat-square&logo=expo" />
  <img src="https://img.shields.io/badge/TypeScript-5.9-3178C6?style=flat-square&logo=typescript" />
  <img src="https://img.shields.io/badge/WebRTC-124-333333?style=flat-square" />
  <img src="https://img.shields.io/badge/Socket.IO-4-010101?style=flat-square&logo=socket.io" />
</p>

---

## 언어 / Language / 言語

- [한국어](#한국어)
- [English](#english)
- [日本語](#日本語)

---

# 한국어

## 프로젝트 소개

**Connecto**는 5분 익명 보이스 채팅 기반의 실시간 매칭 및 언어 교환 플랫폼입니다.  
언어 학습자와 원어민을 랜덤으로 매칭하여 5분간 음성 통화를 제공하고, 마음이 맞는 상대와 친구가 되어 채팅을 이어갈 수 있습니다.

## 주요 기능

| 기능 | 설명 |
|------|------|
| 랜덤 매칭 | 언어/관심사 기반 익명 매칭 + Socket.IO 실시간 대기열 |
| WebRTC 음성 통화 | P2P 5분 음성 통화 (STUN/TURN 서버 지원) |
| 친구 관리 | 통화 후 친구 신청, 수락/거절, 온라인 상태 표시 |
| 실시간 채팅 | 친구와 텍스트/이미지 채팅, 타이핑 인디케이터, 읽음 표시 (✓✓) |
| 소셜 로그인 | Google OAuth 2.0 연동 |
| 푸시 알림 | FCM 기반 친구 통화 요청 알림 |
| 보안 | HTTPS, 인증서 피닝, TURN 자격증명 서버 발급, Rate Limiting |

## 기술 스택

| 분류 | 기술 | 버전 |
|------|------|------|
| Framework | React Native + Expo | 0.81.5 / ~54 |
| Language | TypeScript | ~5.9 |
| Styling | NativeWind (TailwindCSS) | v2 / 3.3.2 |
| State | Zustand | v5 |
| HTTP | Axios | v1 |
| Realtime | Socket.IO Client | v4 |
| Audio/Video | react-native-webrtc | v124 |
| Animation | Moti + Reanimated | v4 |
| Navigation | React Navigation | v7 |
| Token 저장 | expo-secure-store | - |
| 로컬 저장소 | AsyncStorage | - |
| 푸시 알림 | expo-notifications (FCM) | - |

## 프로젝트 구조

```
connecto-app/
├── App.tsx                    # 앱 진입점 — 토큰 복원 + hydration
├── src/
│   ├── api/
│   │   ├── client.ts          # Axios 인스턴스 + 401 interceptor (자동 갱신)
│   │   ├── auth.ts            # 인증 (signup, login, social, refresh, logout)
│   │   ├── profile.ts         # 프로필 CRUD
│   │   ├── languages.ts       # 언어 / 관심사 설정
│   │   ├── match.ts           # 매칭 API
│   │   ├── call.ts            # 통화 API
│   │   ├── socket.ts          # Socket.IO 싱글톤
│   │   ├── friends.ts         # 친구 관리
│   │   ├── chat.ts            # 채팅 API
│   │   ├── report.ts          # 신고
│   │   ├── notifications.ts   # 푸시 알림
│   │   └── webrtc.ts          # TURN 자격증명 API
│   ├── store/
│   │   └── authStore.ts       # Zustand: accessToken, refreshToken, me
│   ├── components/
│   │   ├── CharacterBlob.tsx     # 공통 캐릭터 blob 컴포넌트
│   │   └── IncomingCallModal.tsx # 친구 통화 요청 전역 팝업
│   ├── hooks/
│   │   ├── useSocketMatching.ts  # 매칭 + polling fallback
│   │   ├── useWebRTC.ts          # WebRTC offer/answer/ICE
│   │   ├── useIncomingCall.ts    # 수신 통화 상태 관리
│   │   └── useNotifications.ts  # FCM 토큰 + 핸들러
│   ├── screens/               # 화면 컴포넌트
│   └── navigation/            # 네비게이션 설정
```

## 네비게이션 구조

```
Stack (RootNavigator)
├── Login / SignUp
├── ProfileSetup → LanguageSetup → InterestsSetup
├── MainTabs (Bottom Tab)
│   ├── Home          — 매칭 시작
│   ├── FriendList    — 친구 목록
│   ├── ChatList      — 채팅방 목록
│   └── MyPage        — 마이페이지
├── Matching          — 매칭 대기
├── Call              — WebRTC 통화
├── MatchResult       — 통화 결과
├── Chat              — 채팅
└── BlockList         — 차단 목록
```

## 시작하기

### 사전 요구사항

- Node.js 18+
- Android Studio + AVD (Android 에뮬레이터) 또는 실기기
- Expo CLI

### 설치

```bash
# 의존성 설치
npm install

# 환경 변수 설정
cp .env.example .env
# .env 파일 수정 (아래 환경 변수 섹션 참조)
```

### 환경 변수 (.env)

```env
EXPO_PUBLIC_API_URL=http://10.0.2.2:8080        # 에뮬레이터용
EXPO_PUBLIC_SOCKET_URL=http://10.0.2.2:9092

# Google OAuth 2.0
EXPO_PUBLIC_ANDROID_CLIENT_ID=<android_client_id>.apps.googleusercontent.com
EXPO_PUBLIC_WEB_CLIENT_ID=<web_client_id>.apps.googleusercontent.com

# WebRTC TURN 서버 (선택 사항)
EXPO_PUBLIC_TURN_URL=
EXPO_PUBLIC_TURN_USERNAME=
EXPO_PUBLIC_TURN_CREDENTIAL=
```

> 실기기 테스트 시: `EXPO_PUBLIC_API_URL=http://<PC LAN IP>:8080`

### 실행

```bash
# Expo 개발 서버 시작
npm start

# Android 에뮬레이터 실행
npm run android

# iOS 시뮬레이터 실행
npm run ios
```

## 주요 플로우

### 온보딩
```
신규 유저: SignUp → ProfileSetup → LanguageSetup → InterestsSetup → MainTabs
기존 유저: 앱 실행 → 토큰 복원 → getMe() → MainTabs
토큰 만료: 앱 실행 → 토큰 복원 → getMe() 실패 → Login
```

### 매칭 & 통화
```
Home → [매칭 시작] → Matching (대기) → Call (WebRTC 5분) → MatchResult
                          ↕ Socket.IO match:success
```

### 채팅
```
친구 목록 → [채팅] → ChatScreen
  chat:join emit → chat:send emit → chat:receive on (발신자 포함 브로드캐스트)
  상대방 메시지 수신 시 chat:read emit → ✓✓ 읽음 표시
```

## 보안

- **HTTPS/WSS**: 프로덕션 환경 TLS 적용 (`.env.production`)
- **인증서 피닝**: Android Network Security Config (`network_security_config.xml`)
- **TURN 자격증명**: 하드코딩 없이 서버 API(`GET /webrtc/turn-credentials`)에서 동적 발급
- **Rate Limiting**: 로그인/회원가입 폼 Exponential Backoff + 30초 쿨다운
- **토큰 저장**: `expo-secure-store` (SecureStore, 암호화)
- **프로덕션 console 제거**: `babel-plugin-transform-remove-console`

## 백엔드 연동

| 서버 | 포트 | 설명 |
|------|------|------|
| REST API | 8080 | `/auth`, `/users`, `/match`, `/call`, `/chat`, `/friends` |
| Socket.IO | 9092 | 매칭, WebRTC 시그널링, 채팅, 친구 상태 |

> 백엔드: Spring Boot 3.5.9, PostgreSQL, Redis, Socket.IO (netty-socketio 2.0.3)

---

# English

## Overview

**Connecto** is a real-time matching and language exchange platform based on 5-minute anonymous voice chat.  
It randomly matches language learners with native speakers for a 5-minute voice call, and users can become friends with each other to continue chatting.

## Key Features

| Feature | Description |
|---------|-------------|
| Random Matching | Language/interest-based anonymous matching via Socket.IO real-time queue |
| WebRTC Voice Call | P2P 5-minute voice calls (STUN/TURN server support) |
| Friend Management | Friend requests after calls, accept/reject, online status indicators |
| Real-time Chat | Text/image chat with friends, typing indicators, read receipts (✓✓) |
| Social Login | Google OAuth 2.0 integration |
| Push Notifications | FCM-based friend call request notifications |
| Security | HTTPS, certificate pinning, server-issued TURN credentials, rate limiting |

## Tech Stack

| Category | Technology | Version |
|----------|-----------|---------|
| Framework | React Native + Expo | 0.81.5 / ~54 |
| Language | TypeScript | ~5.9 |
| Styling | NativeWind (TailwindCSS) | v2 / 3.3.2 |
| State | Zustand | v5 |
| HTTP | Axios | v1 |
| Realtime | Socket.IO Client | v4 |
| Audio/Video | react-native-webrtc | v124 |
| Animation | Moti + Reanimated | v4 |
| Navigation | React Navigation | v7 |
| Token Storage | expo-secure-store | - |
| Local Storage | AsyncStorage | - |
| Push Notifications | expo-notifications (FCM) | - |

## Project Structure

```
connecto-app/
├── App.tsx                    # App entry point — token restoration + hydration
├── src/
│   ├── api/
│   │   ├── client.ts          # Axios instance + 401 interceptor (auto-refresh)
│   │   ├── auth.ts            # Auth (signup, login, social, refresh, logout)
│   │   ├── profile.ts         # Profile CRUD
│   │   ├── languages.ts       # Language / interest settings
│   │   ├── match.ts           # Matching API
│   │   ├── call.ts            # Call API
│   │   ├── socket.ts          # Socket.IO singleton
│   │   ├── friends.ts         # Friend management
│   │   ├── chat.ts            # Chat API
│   │   ├── report.ts          # User reporting
│   │   ├── notifications.ts   # Push notifications
│   │   └── webrtc.ts          # TURN credentials API
│   ├── store/
│   │   └── authStore.ts       # Zustand: accessToken, refreshToken, me
│   ├── components/
│   │   ├── CharacterBlob.tsx     # Shared character blob component
│   │   └── IncomingCallModal.tsx # Global incoming call popup
│   ├── hooks/
│   │   ├── useSocketMatching.ts  # Matching + polling fallback
│   │   ├── useWebRTC.ts          # WebRTC offer/answer/ICE
│   │   ├── useIncomingCall.ts    # Incoming call state management
│   │   └── useNotifications.ts  # FCM token + handlers
│   ├── screens/               # Screen components
│   └── navigation/            # Navigation configuration
```

## Navigation Structure

```
Stack (RootNavigator)
├── Login / SignUp
├── ProfileSetup → LanguageSetup → InterestsSetup
├── MainTabs (Bottom Tab)
│   ├── Home          — Start matching
│   ├── FriendList    — Friend list
│   ├── ChatList      — Chat rooms
│   └── MyPage        — Profile & settings
├── Matching          — Waiting for match
├── Call              — WebRTC voice call
├── MatchResult       — Post-call result
├── Chat              — Chat screen
└── BlockList         — Blocked users
```

## Getting Started

### Prerequisites

- Node.js 18+
- Android Studio + AVD (Android Emulator) or a physical device
- Expo CLI

### Installation

```bash
# Install dependencies
npm install

# Configure environment variables
cp .env.example .env
# Edit .env (see Environment Variables section below)
```

### Environment Variables (.env)

```env
EXPO_PUBLIC_API_URL=http://10.0.2.2:8080        # For Android emulator
EXPO_PUBLIC_SOCKET_URL=http://10.0.2.2:9092

# Google OAuth 2.0
EXPO_PUBLIC_ANDROID_CLIENT_ID=<android_client_id>.apps.googleusercontent.com
EXPO_PUBLIC_WEB_CLIENT_ID=<web_client_id>.apps.googleusercontent.com

# WebRTC TURN Server (optional)
EXPO_PUBLIC_TURN_URL=
EXPO_PUBLIC_TURN_USERNAME=
EXPO_PUBLIC_TURN_CREDENTIAL=
```

> For physical device testing: `EXPO_PUBLIC_API_URL=http://<PC LAN IP>:8080`

### Running the App

```bash
# Start Expo dev server
npm start

# Run on Android emulator
npm run android

# Run on iOS simulator
npm run ios
```

## Core Flows

### Onboarding
```
New user:      SignUp → ProfileSetup → LanguageSetup → InterestsSetup → MainTabs
Returning:     App launch → Restore token → getMe() → MainTabs
Expired token: App launch → Restore token → getMe() fails → Login
```

### Matching & Call
```
Home → [Start Match] → Matching (waiting) → Call (WebRTC 5min) → MatchResult
                            ↕ Socket.IO match:success
```

### Chat
```
Friend List → [Chat] → ChatScreen
  emit chat:join → emit chat:send → on chat:receive (broadcast including sender)
  On partner message → emit chat:read → ✓✓ read receipt displayed
```

## Security

- **HTTPS/WSS**: TLS enforced in production (`.env.production`)
- **Certificate Pinning**: Android Network Security Config (`network_security_config.xml`)
- **TURN Credentials**: Dynamically issued from server API (`GET /webrtc/turn-credentials`) — no hardcoding
- **Rate Limiting**: Login/signup form with Exponential Backoff + 30s cooldown
- **Token Storage**: `expo-secure-store` (encrypted SecureStore)
- **Production Console Removal**: `babel-plugin-transform-remove-console`

## Backend Integration

| Server | Port | Description |
|--------|------|-------------|
| REST API | 8080 | `/auth`, `/users`, `/match`, `/call`, `/chat`, `/friends` |
| Socket.IO | 9092 | Matching, WebRTC signaling, chat, friend status |

> Backend: Spring Boot 3.5.9, PostgreSQL, Redis, Socket.IO (netty-socketio 2.0.3)

---

# 日本語

## プロジェクト概要

**Connecto**は、5分間の匿名ボイスチャットをベースにしたリアルタイムマッチング・語学交換プラットフォームです。  
言語学習者とネイティブスピーカーをランダムにマッチングし、5分間の音声通話を提供します。気の合った相手と友達になり、チャットを続けることができます。

## 主な機能

| 機能 | 説明 |
|------|------|
| ランダムマッチング | 言語・興味関心ベースの匿名マッチング + Socket.IOリアルタイムキュー |
| WebRTC音声通話 | P2P 5分間音声通話（STUN/TURNサーバー対応） |
| フレンド管理 | 通話後の友達申請、承認/拒否、オンライン状態表示 |
| リアルタイムチャット | テキスト/画像チャット、タイピングインジケーター、既読表示（✓✓） |
| ソーシャルログイン | Google OAuth 2.0連携 |
| プッシュ通知 | FCMベースの友達通話リクエスト通知 |
| セキュリティ | HTTPS、証明書ピンニング、サーバー発行TURNクレデンシャル、レート制限 |

## 技術スタック

| カテゴリ | 技術 | バージョン |
|----------|------|-----------|
| フレームワーク | React Native + Expo | 0.81.5 / ~54 |
| 言語 | TypeScript | ~5.9 |
| スタイリング | NativeWind (TailwindCSS) | v2 / 3.3.2 |
| 状態管理 | Zustand | v5 |
| HTTP | Axios | v1 |
| リアルタイム | Socket.IO Client | v4 |
| 音声/映像 | react-native-webrtc | v124 |
| アニメーション | Moti + Reanimated | v4 |
| ナビゲーション | React Navigation | v7 |
| トークン保存 | expo-secure-store | - |
| ローカルストレージ | AsyncStorage | - |
| プッシュ通知 | expo-notifications (FCM) | - |

## プロジェクト構成

```
connecto-app/
├── App.tsx                    # アプリエントリーポイント — トークン復元 + hydration
├── src/
│   ├── api/
│   │   ├── client.ts          # Axiosインスタンス + 401インターセプター（自動更新）
│   │   ├── auth.ts            # 認証（signup, login, social, refresh, logout）
│   │   ├── profile.ts         # プロフィールCRUD
│   │   ├── languages.ts       # 言語・興味関心設定
│   │   ├── match.ts           # マッチングAPI
│   │   ├── call.ts            # 通話API
│   │   ├── socket.ts          # Socket.IOシングルトン
│   │   ├── friends.ts         # フレンド管理
│   │   ├── chat.ts            # チャットAPI
│   │   ├── report.ts          # 通報
│   │   ├── notifications.ts   # プッシュ通知
│   │   └── webrtc.ts          # TURNクレデンシャルAPI
│   ├── store/
│   │   └── authStore.ts       # Zustand: accessToken, refreshToken, me
│   ├── components/
│   │   ├── CharacterBlob.tsx     # 共通キャラクタープロブコンポーネント
│   │   └── IncomingCallModal.tsx # グローバル着信ポップアップ
│   ├── hooks/
│   │   ├── useSocketMatching.ts  # マッチング + ポーリングフォールバック
│   │   ├── useWebRTC.ts          # WebRTC offer/answer/ICE
│   │   ├── useIncomingCall.ts    # 着信状態管理
│   │   └── useNotifications.ts  # FCMトークン + ハンドラー
│   ├── screens/               # 画面コンポーネント
│   └── navigation/            # ナビゲーション設定
```

## ナビゲーション構成

```
Stack (RootNavigator)
├── Login / SignUp
├── ProfileSetup → LanguageSetup → InterestsSetup
├── MainTabs (ボトムタブ)
│   ├── Home          — マッチング開始
│   ├── FriendList    — フレンドリスト
│   ├── ChatList      — チャットルーム一覧
│   └── MyPage        — マイページ
├── Matching          — マッチング待機
├── Call              — WebRTC音声通話
├── MatchResult       — 通話結果
├── Chat              — チャット画面
└── BlockList         — ブロックリスト
```

## はじめ方

### 前提条件

- Node.js 18以上
- Android Studio + AVD（Androidエミュレーター）または実機
- Expo CLI

### インストール

```bash
# 依存関係のインストール
npm install

# 環境変数の設定
cp .env.example .env
# .envファイルを編集（以下の環境変数セクション参照）
```

### 環境変数 (.env)

```env
EXPO_PUBLIC_API_URL=http://10.0.2.2:8080        # Androidエミュレーター用
EXPO_PUBLIC_SOCKET_URL=http://10.0.2.2:9092

# Google OAuth 2.0
EXPO_PUBLIC_ANDROID_CLIENT_ID=<android_client_id>.apps.googleusercontent.com
EXPO_PUBLIC_WEB_CLIENT_ID=<web_client_id>.apps.googleusercontent.com

# WebRTC TURNサーバー（オプション）
EXPO_PUBLIC_TURN_URL=
EXPO_PUBLIC_TURN_USERNAME=
EXPO_PUBLIC_TURN_CREDENTIAL=
```

> 実機テスト時: `EXPO_PUBLIC_API_URL=http://<PC LAN IP>:8080`

### アプリの起動

```bash
# Expo開発サーバー起動
npm start

# Androidエミュレーターで実行
npm run android

# iOSシミュレーターで実行
npm run ios
```

## 主なフロー

### オンボーディング
```
新規ユーザー: SignUp → ProfileSetup → LanguageSetup → InterestsSetup → MainTabs
既存ユーザー: アプリ起動 → トークン復元 → getMe() → MainTabs
トークン期限切れ: アプリ起動 → トークン復元 → getMe()失敗 → Login
```

### マッチング & 通話
```
Home → [マッチング開始] → Matching（待機）→ Call（WebRTC 5分）→ MatchResult
                              ↕ Socket.IO match:success
```

### チャット
```
フレンドリスト → [チャット] → ChatScreen
  chat:join emit → chat:send emit → chat:receive on（送信者含む全員ブロードキャスト）
  相手のメッセージ受信時 → chat:read emit → ✓✓ 既読表示
```

## セキュリティ

- **HTTPS/WSS**: 本番環境でTLS適用（`.env.production`）
- **証明書ピンニング**: Android Network Security Config（`network_security_config.xml`）
- **TURNクレデンシャル**: サーバーAPI（`GET /webrtc/turn-credentials`）で動的発行（ハードコーディングなし）
- **レート制限**: ログイン/会員登録フォームにExpotential Backoff + 30秒クールダウン
- **トークン保存**: `expo-secure-store`（暗号化SecureStore）
- **本番consoleログ除去**: `babel-plugin-transform-remove-console`

## バックエンド連携

| サーバー | ポート | 説明 |
|---------|--------|------|
| REST API | 8080 | `/auth`, `/users`, `/match`, `/call`, `/chat`, `/friends` |
| Socket.IO | 9092 | マッチング、WebRTCシグナリング、チャット、フレンド状態 |

> バックエンド: Spring Boot 3.5.9、PostgreSQL、Redis、Socket.IO（netty-socketio 2.0.3）

---

<p align="center">
  Made with ❤️ by the Connecto Team
</p>
