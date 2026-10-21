import * as SecureStore from 'expo-secure-store'

const KEY = 'lpp.rememberMe'

/** false only when the user explicitly unticked "Remember me" at sign-in. */
export async function getRememberMe(): Promise<boolean> {
  try {
    return (await SecureStore.getItemAsync(KEY)) !== 'false'
  } catch {
    return true
  }
}

export async function setRememberMe(value: boolean): Promise<void> {
  try {
    await SecureStore.setItemAsync(KEY, value ? 'true' : 'false')
  } catch {
    /* preference only */
  }
}
