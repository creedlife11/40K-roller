import React from 'react';
import { View, Platform, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import { MaterialCommunityIcons } from '@expo/vector-icons';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import HomeScreen from './src/screens/HomeScreen';
import WH40KScreen from './src/screens/WH40KScreen';
import HistoryScreen from './src/screens/HistoryScreen';
import CustomScreen from './src/screens/CustomScreen';
import { COLORS } from './src/theme';

const Tab = createBottomTabNavigator();

export default function App() {
  return (
    <GestureHandlerRootView style={Platform.OS === 'web' ? { flex: 1, height: '100vh' as any } : { flex: 1 }}>
      <SafeAreaProvider>
        {/* On web, centre the app in a phone-width column */}
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
                const icons: Record<string, keyof typeof MaterialCommunityIcons.glyphMap> = {
                  Roll: 'dice-multiple',
                  '40K': 'sword-cross',
                  History: 'chart-bar',
                  Custom: 'dice-d20',
                };
                return (
                  <MaterialCommunityIcons
                    name={icons[route.name] ?? 'dice'}
                    size={size}
                    color={color}
                  />
                );
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
