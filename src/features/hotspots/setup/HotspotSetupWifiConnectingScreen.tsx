import React, { useCallback } from 'react'
import { uniq } from 'lodash'
import { useAsync } from 'react-async-hook'
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native'
import { useTranslation } from 'react-i18next'
import { useSelector } from 'react-redux'
import { useHotspotBle } from '@helium/react-native-sdk'
import useAlert from '../../../utils/useAlert'
import {
  HotspotSetupNavigationProp,
  HotspotSetupStackParamList,
} from './hotspotSetupTypes'
import Text from '../../../components/Text'
import Box from '../../../components/Box'
import SafeAreaBox from '../../../components/SafeAreaBox'
import { RootState } from '../../../store/rootReducer'

type Route = RouteProp<
  HotspotSetupStackParamList,
  'HotspotSetupWifiConnectingScreen'
>

const HotspotSetupWifiConnectingScreen = () => {
  const { t } = useTranslation()
  const navigation = useNavigation<HotspotSetupNavigationProp>()
  const { connectedHotspot } = useSelector((state: RootState) => state)

  const {
    params: { network, password },
  } = useRoute<Route>()

  const { readWifiNetworks, setWifi, removeConfiguredWifi } = useHotspotBle()

  const { showOKAlert } = useAlert()

  const handleError = useCallback(
    async (messageKey: string) => {
      await showOKAlert({ titleKey: 'generic.error', messageKey })
      navigation.goBack()
    },
    [navigation, showOKAlert],
  )

  const goToNextStep = useCallback(() => {
    if (connectedHotspot.status === 'owned') {
      navigation.replace('OwnedHotspotErrorScreen')
    } else if (connectedHotspot.status === 'global') {
      navigation.replace('NotHotspotOwnerErrorScreen')
    } else {
      navigation.replace('HotspotSetupLocationInfoScreen')
    }
  }, [connectedHotspot.status, navigation])

  const connectToWifi = useCallback(async () => {
    const response = await setWifi(network, password)
    if (response === 'not_found') {
      showOKAlert({
        titleKey: 'generic.error',
        messageKey: 'generic.something_went_wrong',
      })
      navigation.goBack()
    } else if (response === 'invalid') {
      showOKAlert({
        titleKey: 'generic.error',
        messageKey: 'generic.invalid_password',
      })
      navigation.goBack()
    } else {
      goToNextStep()
    }
  }, [goToNextStep, navigation, network, password, setWifi, showOKAlert])

  const forgetWifi = async () => {
    try {
      const connectedNetworks = uniq((await readWifiNetworks(true)) || [])
      if (connectedNetworks.length > 0) {
        await removeConfiguredWifi(connectedNetworks[0])
      }
    } catch (e) {
      handleError(e)
    }
  }

  useAsync(async () => {
    await forgetWifi()
    connectToWifi()
  }, [])

  return (
    <SafeAreaBox flex={1} backgroundColor="primaryBackground">
      <Box flex={1} justifyContent="center" paddingBottom="xxl">
        <Box marginTop="xl">
          <Text variant="body1" textAlign="center">
            {t('hotspot_setup.wifi_password.connecting').toUpperCase()}
          </Text>
        </Box>
      </Box>
    </SafeAreaBox>
  )
}

export default HotspotSetupWifiConnectingScreen
