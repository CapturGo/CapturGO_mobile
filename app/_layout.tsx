import { Stack } from 'expo-router';
import '/Users/bhun/Captur/my-app/tasks/locationTask.ts'; 

export default function Layout() {
  return (
    <Stack>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
    </Stack>
  );
}
