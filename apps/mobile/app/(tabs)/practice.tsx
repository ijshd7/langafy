import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { MessageSquareIcon } from 'lucide-react-native';
import { View } from 'react-native';

export default function PracticeScreen() {
  return (
    <View className="flex-1 items-center justify-center gap-6 bg-background px-4">
      <View className="h-16 w-16 rounded-2xl bg-purple-500 items-center justify-center">
        <Icon as={MessageSquareIcon} className="size-8 text-white" />
      </View>
      <View className="gap-2">
        <Text className="text-center text-xl font-bold text-foreground">Practice & Play</Text>
        <Text className="text-center text-sm text-muted-foreground">Conversation AI and games</Text>
      </View>
      <Text className="text-center text-xs text-muted-foreground">Coming soon — Phase 7</Text>
    </View>
  );
}
