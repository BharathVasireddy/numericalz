import React from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { AlertTriangle, ArrowRight } from 'lucide-react'
import { getStageDisplayName } from '@/lib/workflow-validation'

interface WorkflowSkipWarningDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  workflowType: 'VAT' | 'LTD'
  currentStage: string
  targetStage: string
  skippedStages: string[]
  clientName: string
}

export function WorkflowSkipWarningDialog({
  isOpen,
  onClose,
  onConfirm,
  workflowType,
  currentStage,
  targetStage,
  skippedStages,
  clientName
}: WorkflowSkipWarningDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <DialogTitle className="text-lg font-semibold">
                Workflow Stage Skipping Detected
              </DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground">
                You are attempting to skip workflow stages
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
            <h4 className="font-medium text-amber-900 mb-2">Client: {clientName}</h4>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <Badge variant="outline" className="bg-blue-50 text-blue-700">
                  Current Stage
                </Badge>
                <span>{getStageDisplayName(currentStage, workflowType)}</span>
              </div>
              
              <div className="flex items-center gap-2">
                <ArrowRight className="h-4 w-4 text-gray-400" />
              </div>
              
              <div className="flex items-center gap-2 text-sm">
                <Badge variant="outline" className="bg-green-50 text-green-700">
                  Target Stage
                </Badge>
                <span>{getStageDisplayName(targetStage, workflowType)}</span>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="font-medium text-red-900">
              The following stages will be skipped:
            </h4>
            <div className="space-y-2">
              {skippedStages.map((stage, index) => (
                <div 
                  key={stage}
                  className="flex items-center gap-3 p-3 rounded-lg border border-red-200 bg-red-50"
                >
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-red-100 text-red-600 text-xs font-medium">
                    {index + 1}
                  </div>
                  <span className="text-sm text-red-800">
                    {getStageDisplayName(stage, workflowType)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-red-200 bg-red-50 p-4">
            <h4 className="font-medium text-red-900 mb-2">⚠️ Important Notes:</h4>
            <ul className="text-sm text-red-800 space-y-1">
              <li>• Skipping stages may result in incomplete workflow tracking</li>
              <li>• Milestone dates for skipped stages will not be recorded</li>
              <li>• This may affect reporting and compliance requirements</li>
              <li>• Consider progressing through stages sequentially for best practices</li>
            </ul>
          </div>

          <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
                        <h4 className="font-medium text-blue-900 mb-2">💡 Recommended Action:</h4>
            <p className="text-sm text-blue-800">
              Progress to the next stage {skippedStages.length > 0 && skippedStages[0] && (
                <>(<strong>{getStageDisplayName(skippedStages[0], workflowType)}</strong>)</>
              )} instead of skipping to ensure proper workflow tracking and compliance.
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button 
            variant="outline" 
            onClick={onClose}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button 
            variant="destructive" 
            onClick={onConfirm}
            className="flex-1"
          >
            Skip Stages Anyway
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
} 