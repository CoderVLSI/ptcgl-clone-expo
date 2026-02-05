import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Colors from '../constants/colors';

interface DialogBoxProps {
    message: string;
    characterName?: string;
}

export const DialogBox: React.FC<DialogBoxProps> = ({
    message,
    characterName = 'Professor',
}) => {
    return (
        <View style={styles.container}>
            <View style={styles.dialogBox}>
                <View style={styles.arrowLeft} />
                <Text style={styles.message}>{message}</Text>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        paddingHorizontal: 20,
        paddingVertical: 8,
    },
    dialogBox: {
        backgroundColor: Colors.ui.dialogBg,
        borderRadius: 12,
        paddingHorizontal: 20,
        paddingVertical: 14,
        borderWidth: 2,
        borderColor: 'rgba(255, 255, 255, 0.2)',
        shadowColor: Colors.ui.black,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.5,
        shadowRadius: 8,
        elevation: 10,
    },
    arrowLeft: {
        position: 'absolute',
        left: -10,
        top: '50%',
        marginTop: -8,
        width: 0,
        height: 0,
        borderTopWidth: 8,
        borderBottomWidth: 8,
        borderRightWidth: 10,
        borderTopColor: 'transparent',
        borderBottomColor: 'transparent',
        borderRightColor: Colors.ui.dialogBg,
    },
    message: {
        color: Colors.ui.white,
        fontSize: 14,
        lineHeight: 20,
        textAlign: 'center',
        fontStyle: 'italic',
    },
});

export default DialogBox;
