import React from 'react';
import { View, Platform, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Svg, { Path, Circle, Rect, Line, Polyline } from 'react-native-svg';

import HomeScreen from './src/screens/HomeScreen';
import WH40KScreen from './src/screens/WH40KScreen';
import HistoryScreen from './src/screens/HistoryScreen';
import CustomScreen from './src/screens/CustomScreen';
import { COLORS } from './src/theme';

const Tab = createBottomTabNavigator();

// ── SVG tab icons (no expo-font dependency) ──────────────────────────────────

function DiceIcon({ color, size }: { color: string; size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x="3" y="3" width="18" height="18" rx="3" stroke={color} strokeWidth="2" />
      <Circle cx="8.5" cy="8.5" r="1.5" fill={color} />
      <Circle cx="15.5" cy="8.5" r="1.5" fill={color} />
      <Circle cx="8.5" cy="15.5" r="1.5" fill={color} />
      <Circle cx="15.5" cy="15.5" r="1.5" fill={color} />
      <Circle cx="12" cy="12" r="1.5" fill={color} />
    </Svg>
  );
}

function SwordIcon({ color, size }: { color: string; size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M14.5 17.5L3 6V3h3l11.5 11.5" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M13 19l6-6" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <Path d="M16 16l3.5 3.5" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <Path d="M3 9l3-3" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </Svg>
  );
}

function ChartIcon({ color, size }: { color: string; size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x="3" y="12" width="4" height="9" rx="1" fill={color} opacity="0.7" />
      <Rect x="10" y="7" width="4" height="14" rx="1" fill={color} />
      <Rect x="17" y="3" width="4" height="18" rx="1" fill={color} opacity="0.7" />
    </Svg>
  );
}

function D20Icon({ color, size }: { color: string; size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M12 2L3 7v10l9 5 9-5V7L12 2z" stroke={color} strokeWidth="2" strokeLinejoin="round" />
      <Path d="M12 2l-4.5 9H3M12 2l4.5 9H21M7.5 11H3l9 11M16.5 11H21l-9 11M7.5 11h9" stroke={color} strokeWidth="1.5" strokeLinejoin="round" />
    </Svg>
  );
}

const TAB_ICONS: Record<string, React.ComponentType<{ color: string; size: number }>> = {
  Roll: DiceIcon,
  '40K': SwordIcon,
  History: ChartIcon,
  Custom: D20Icon,
};

export default function App() {
  return (
    <GestureHandlerRootView style={Platform.OS === 'web' ? { flex: 1, height: '100vh' as any } : { flex: 1 }}>
      <SafeAreaProvider>
        <View style={Platform.OS === 'web' ? webStyles.outerWrapper : { flex: 1 }}>
          <View style={Platform.OS === 'web' ? webStyles.phoneFrame : { flex: 1 }}>
            <NavigationContainer
              theme={{
                dark: true,
                colors: {
                  primary: COLORS.primary,
                  background: COLORS.bg,
                  card: COLORS.surface,
                  text: COLORS.text,
                  border: COLORS.border,
                  notification: COLORS.primary,
                },
              }}
            >
              <Tab.Navigator
                screenOptions={({ route }) => ({
                  headerShown: false,
                  tabBarStyle: {
                    backgroundColor: COLORS.surface,
                    borderTopColor: COLORS.border,
                    borderTopWidth: 1,
                    height: 60,
                    paddingBottom: 8,
                  },
                  tabBarActiveTintColor: COLORS.primary,
                  tabBarInactiveTintColor: COLORS.textSecondary,
                  tabBarLabelStyle: {
                    fontSize: 10,
                    fontWeight: '700',
                    letterSpacing: 0.8,
                  },
                  tabBarIcon: ({ color, size }) => {
                    const Icon = TAB_ICONS[route.name];
                    return Icon ? <Icon color={color} size={size} /> : null;
                  },
                })}
              >
                <Tab.Screen name="Roll" component={HomeScreen} />
                <Tab.Screen name="40K" component={WH40KScreen} />
                <Tab.Screen name="History" component={HistoryScreen} />
                <Tab.Screen name="Custom" component={CustomScreen} />
              </Tab.Navigator>
            </NavigationContainer>
          </View>
        </View>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const webStyles = StyleSheet.create({
  outerWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#000',
  },
  phoneFrame: {
    width: '100%',
    maxWidth: 480,
    flex: 1,
    overflow: 'hidden',
    backgroundColor: COLORS.bg,
  },
});
