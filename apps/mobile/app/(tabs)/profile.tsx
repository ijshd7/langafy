import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { UserIcon } from 'lucide-react-native';
import { View } from 'react-native';

export default function ProfileScreen() {
  return (
    <View className="flex-1 items-center justify-center gap-6 bg-background px-4">
      <View className="h-16 w-16 rounded-2xl bg-amber-500 items-center justify-center">
        <Icon as={UserIcon} className="size-8 text-white" />
      </View>
      <View className="gap-2">
        <Text className="text-center text-xl font-bold text-foreground">Your Profile</Text>
        <Text className="text-center text-sm text-muted-foreground">Settings and progress</Text>
      </View>
      <Text className="text-center text-xs text-muted-foreground">Coming soon — Phase 4</Text>
    </View>
  );
}
