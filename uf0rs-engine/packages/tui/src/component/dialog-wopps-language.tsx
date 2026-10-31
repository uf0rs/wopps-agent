import { DialogSelect } from "../ui/dialog-select"
import { useTuiPaths } from "../context/runtime"
import { saveInterfaceLanguage, type InterfaceLanguage } from "../util/interface-language"
import { setCurrentInterfaceLanguage, useInterfaceLanguage } from "../util/interface-language"
import { useToast } from "../ui/toast"
import { useDialog } from "../ui/dialog"

export function DialogWoppsLanguage(props: { onSelect?: (language: InterfaceLanguage) => void }) {
  const paths = useTuiPaths()
  const toast = useToast()
  const dialog = useDialog()
  const language = useInterfaceLanguage()

  return (
    <DialogSelect<InterfaceLanguage>
      title="Язык WOPPS · WOPPS language · Langue de WOPPS"
      current={language()}
      options={[
        { value: "ru", title: "Русский", description: "Русский язык интерфейса" },
        { value: "en", title: "English", description: "English interface" },
        { value: "fr", title: "Français", description: "Interface en français" },
      ]}
      onSelect={(option) => {
        void saveInterfaceLanguage(paths.state, option.value)
          .then(() => {
            setCurrentInterfaceLanguage(option.value)
            props.onSelect?.(option.value)
            dialog.clear()
          })
          .catch(toast.error)
      }}
    />
  )
}
