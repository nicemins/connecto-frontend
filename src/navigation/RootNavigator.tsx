import * as React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import type { RootStackParamList } from "./types";
import { navigationRef } from "./navigationRef";
import LoginScreen from "../screens/LoginScreen";
import SignUpScreen from "../screens/SignUpScreen";
import ProfileSetupScreen from "../screens/ProfileSetupScreen";
import LanguageSetupScreen from "../screens/LanguageSetupScreen";
import InterestsSetupScreen from "../screens/InterestsSetupScreen";
import MatchingScreen from "../screens/MatchingScreen";
import CallScreen from "../screens/CallScreen";
import MatchResultScreen from "../screens/MatchResultScreen";
import ChatScreen from "../screens/ChatScreen";
import BlockListScreen from "../screens/BlockListScreen";
import MainTabNavigator from "./MainTabNavigator";

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootNavigator() {
  return (
    <NavigationContainer ref={navigationRef}>
      <Stack.Navigator
        initialRouteName="Login"
        screenOptions={{ headerShown: false }}
      >
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="SignUp" component={SignUpScreen} />
        <Stack.Screen name="ProfileSetup" component={ProfileSetupScreen} />
        <Stack.Screen name="LanguageSetup" component={LanguageSetupScreen} />
        <Stack.Screen name="InterestsSetup" component={InterestsSetupScreen} />
        <Stack.Screen name="MainTabs" component={MainTabNavigator} />
        <Stack.Screen name="Matching" component={MatchingScreen} />
        <Stack.Screen name="Call" component={CallScreen} />
        <Stack.Screen name="MatchResult" component={MatchResultScreen} />
        <Stack.Screen name="Chat" component={ChatScreen} />
        <Stack.Screen name="BlockList" component={BlockListScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
