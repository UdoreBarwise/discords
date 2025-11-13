import AutoRolesConfig from '../../components/AutoRoles/AutoRolesConfig'
import './AutoRoles.css'

export default function AutoRoles() {
  return (
    <div className="auto-roles-page">
      <div className="auto-roles-header">
        <h1>Auto Roles</h1>
        <p className="auto-roles-subtitle">
          Configure reaction-based role assignment. Users can react to an embed message to get roles automatically.
        </p>
      </div>
      <AutoRolesConfig />
    </div>
  )
}

