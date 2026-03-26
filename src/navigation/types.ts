export type RootStackParamList = {
  Login: undefined;
  SignUp: undefined;
  ProfileSetup: undefined;
  LanguageSetup: undefined;
  InterestsSetup: undefined;
  MainTabs: undefined;
  Matching: undefined;
  Call: {
    sessionId: number;
    webrtcChannelId: string;
    isOfferer: boolean;
  };
  MatchResult: {
    sessionId: number;
    partnerId?: string;
    totalTime: string;
  };
  Chat: {
    roomId: number;
    friendNickname: string;
    friendProfileImageUrl?: string;
  };
  BlockList: undefined;
};

export type MainTabParamList = {
  Home: undefined;
  FriendList: undefined;
  ChatList: undefined;
  MyPage: undefined;
};
