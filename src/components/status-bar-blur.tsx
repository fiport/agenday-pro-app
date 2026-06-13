import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/hooks/use-theme';

type Props = {
  height: number;
};

const FadeAlphaSteps = ['8F', '78', '62', '4E', '3A', '2A', '1C', '10', '08'];
const FadeStepHeight = 4;

export function StatusBarBlur({ height }: Props) {
  const theme = useTheme();
  const fadeHeight = FadeAlphaSteps.length * FadeStepHeight;

  return (
    <View pointerEvents="none" style={[styles.container, { height: height + fadeHeight }]}>
      <View
        style={[
          styles.bar,
          { height, backgroundColor: theme.background + 'A8' },
        ]}
      />
      <View style={[styles.fade, { top: height }]}>
        {FadeAlphaSteps.map((alpha, index) => (
          <View
            key={index}
            style={[
              styles.fadeStep,
              {
                height: FadeStepHeight,
                top: index * FadeStepHeight,
                backgroundColor: theme.background + alpha,
              },
            ]}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  bar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  fade: {
    position: 'absolute',
    left: 0,
    right: 0,
  },
  fadeStep: {
    position: 'absolute',
    left: 0,
    right: 0,
  },
});
