import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { HomeIcon } from 'lucide-react-native';
import { View } from 'react-native';

export default function HomeScreen() {
  return (
    <View className="flex-1 items-center justify-center gap-6 bg-background px-4">
      <View className="h-16 w-16 rounded-2xl bg-cyan-500 items-center justify-center">
        <Icon as={HomeIcon} className="size-8 text-white" />
      </View>
      <View className="gap-2">
        <Text className="text-center text-xl font-bold text-foreground">Welcome Home</Text>
        <Text className="text-center text-sm text-muted-foreground">Your learning dashboard</Text>
      </View>
      <Text className="text-center text-xs text-muted-foreground">Coming soon — Phase 4.6</Text>
    </View>
  );
}
