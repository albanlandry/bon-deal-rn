// app/(tabs)/profile.tsx - Profile Tab Screen
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { theme } from '../../utils/theme';

export default function ProfileScreen() {
    return (
        <View style={styles.container}>
            <Text style={styles.text}>Profile Screen</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: theme.colors.white,
    },
    text: {
        fontSize: 18,
    },
});
