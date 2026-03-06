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
};

export type MainTabParamList = {
  Home: undefined;
  FriendList: undefined;
  MyPage: undefined;
};
