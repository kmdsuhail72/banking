import mongoose from "mongoose";
import { states, severities } from "./domain.js";

export function incidentModel(connection) {
  const schema = new mongoose.Schema(
    {
      title: { type: String, required: true, maxlength: 2000 },
      description: { type: String, maxlength: 2000 },
      service: { type: String, required: true, maxlength: 120 },
      severity: { type: String, enum: severities, required: true },
      status: { type: String, enum: states, required: true },
      owner: String,
      assignee: String,
      impact: { type: String, maxlength: 20000 },
      rootCause: { type: String, maxlength: 20000 },
      postmortem: { type: String, maxlength: 20000 },
      source: String,
      occurrenceKey: String,
      alertName: String,
      alertState: String,
      alertEndedAt: Date,
      openedAt: { type: Date, required: true },
      resolvedAt: Date,
      closedAt: Date,
      dashboardUrl: String,
      version: { type: Number, default: 0 },
      tasks: [
        {
          _id: false,
          id: String,
          title: String,
          assignee: String,
          dueAt: Date,
          status: { type: String, enum: ["TODO", "IN_PROGRESS", "DONE"] },
        },
      ],
      timeline: [
        new mongoose.Schema(
          {
            id: String,
            at: Date,
            actor: String,
            type: { type: String },
            message: String,
          },
          { _id: false },
        ),
      ],
    },
    { timestamps: true, versionKey: false, strict: "throw" },
  );
  schema.index(
    { occurrenceKey: 1 },
    {
      unique: true,
      partialFilterExpression: { occurrenceKey: { $type: "string" } },
    },
  );
  schema.index({ openedAt: -1, _id: -1 });
  schema.index({ status: 1, severity: 1, openedAt: -1 });
  return connection.model("Incident", schema);
}
