import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import React from "react";

// Import das telas
import HomeScreen from "./(tabs)/index";
import ScheduleScreen from "./agendamento";
import RegisterScreen from "./cadastro";
import ConsultasScreen from "./consultas";
import ChoosePsychologistScreen from "./escolha";
import HomeP from "./homep";
import LoginScreen from "./login";
import ProfileScreen from "./perfil";

// Tipagem das rotas
export type RootStackParamList = {
  Login: undefined;
  Home: undefined;
  Register: undefined;
  HomeP: undefined;
  Profile: undefined;
  Schedule: { psychologist?: any };
  ChoosePsychologist: undefined;
  Consultas: undefined;
  Details: { id: number };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function Router() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Login">
        <Stack.Screen
          name="Login"
          component={LoginScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Register"
          component={RegisterScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Home"
          component={HomeScreen}
          options={{ title: "Início" }}
        />
        <Stack.Screen
          name="HomeP"
          component={HomeP}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Profile"
          component={ProfileScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="ChoosePsychologist"
          component={ChoosePsychologistScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Schedule"
          component={ScheduleScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Consultas"
          component={ConsultasScreen}
          options={{ title: "Consultas" }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
