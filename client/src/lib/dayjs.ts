import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import timezone from 'dayjs/plugin/timezone'
import relativeTime from 'dayjs/plugin/relativeTime'
import localizedFormat from 'dayjs/plugin/localizedFormat'
import 'dayjs/locale/pt-br'

// Configurar plugins
dayjs.extend(utc)
dayjs.extend(timezone)
dayjs.extend(relativeTime)
dayjs.extend(localizedFormat)

// Configurar localização para português brasileiro
dayjs.locale('pt-br')

// Configurar timezone padrão para São Paulo
dayjs.tz.setDefault('America/Sao_Paulo')

export default dayjs