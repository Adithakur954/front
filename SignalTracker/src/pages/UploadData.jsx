import React, { useState, useCallback, useEffect } from "react";
import { useDropzone } from "react-dropzone";
import { excelApi } from "../api/apiEndpoints";
import { toast } from "react-toastify";
import { Button } from "@/components/ui/button";
import { UploadCloud, File, X, Download } from "lucide-react";
import Spinner from "../components/common/Spinner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import SessionSelector from "../components/common/SessionSelector";

const FILE_TYPES = [
  "text/csv",
  "application/zip",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
];
const POLYGON_TYPES = [
  "application/zip",
  "application/geo+json",
  "application/json",
  "text/csv"
];

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

const UploadDataPage = () => {
  const [sessionFiles, setSessionFiles] = useState([]);
  const [predictionFiles, setPredictionFiles] = useState([]);
  const [polygonFile, setPolygonFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [remarks, setRemarks] = useState("");
  const [projectName, setProjectName] = useState("");
  const [selectedSessions, setSelectedSessions] = useState([]);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [activeTab, setActiveTab] = useState("session");
  const [errorLog, setErrorLog] = useState("");

  // DRY: File validation
  const validateFile = (file, allowedTypes) => {
    if (!allowedTypes.includes(file.type)) {
      toast.error(`File type ${file.type} not supported.`);
      return false;
    }
    if (file.size > MAX_FILE_SIZE) {
      toast.error("File is too large. (Max 50MB)");
      return false;
    }
    return true;
  };

  const onDropSession = useCallback(
    (acceptedFiles) => {
      const valid = acceptedFiles.filter((file) => validateFile(file, FILE_TYPES));
      setSessionFiles((prev) => [...prev, ...valid]);
    },
    []
  );
  const onDropPrediction = useCallback(
    (acceptedFiles) => {
      const valid = acceptedFiles.filter((file) => validateFile(file, FILE_TYPES));
      setPredictionFiles((prev) => [...prev, ...valid]);
    },
    []
  );
  const onDropPolygon = useCallback(
    (acceptedFiles) => {
      const valid = acceptedFiles.filter((file) => validateFile(file, POLYGON_TYPES));
      if (valid.length > 0) setPolygonFile(valid[0]);
    },
    []
  );

  const {
    getRootProps: getRootPropsSession,
    getInputProps: getInputPropsSession,
    isDragActive: isDragActiveSession
  } = useDropzone({
    onDrop: onDropSession,
    accept: FILE_TYPES,
    multiple: false
  });
  const {
    getRootProps: getRootPropsPrediction,
    getInputProps: getInputPropsPrediction,
    isDragActive: isDragActivePrediction
  } = useDropzone({
    onDrop: onDropPrediction,
    accept: FILE_TYPES,
    multiple: false
  });
  const {
    getRootProps: getRootPropsPolygon,
    getInputProps: getInputPropsPolygon,
    isDragActive: isDragActivePolygon
  } = useDropzone({
    onDrop: onDropPolygon,
    accept: POLYGON_TYPES,
    multiple: false
  });

  const removeFile = (fileToRemove, type) => {
    if (type === "session") setSessionFiles((files) => files.filter((file) => file !== fileToRemove));
    else if (type === "prediction") setPredictionFiles((files) => files.filter((file) => file !== fileToRemove));
    else if (type === "polygon") setPolygonFile(null);
  };

  const fetchUploadedFiles = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const response = await excelApi.getUploadedFiles(0);
      setUploadedFiles(response.Data || []);
    } catch (error) {
      toast.error(`Failed to fetch uploaded files: ${error.message}`);
      setUploadedFiles([]);
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUploadedFiles();
  }, [fetchUploadedFiles]);

  // File upload handler (calls backend/.NET controller)
  const handleUpload = async () => {
    const files = activeTab === "session" ? sessionFiles : predictionFiles;
    if (files.length === 0) {
      toast.warn("Please select a file to upload.");
      return;
    }
    if (activeTab === "prediction" && !projectName.trim()) {
      toast.warn("Project Name is required for Prediction upload.");
      return;
    }

    setLoading(true);
    setErrorLog("");
    const formData = new FormData();
    // Backend expects: directoryPath, originalFileName, polygonFilePath, fileType, projectId, Remarks
    formData.append("directoryPath", files[0]);
    formData.append("originalFileName", files[0].name);
    formData.append("fileType", activeTab === "session" ? "1" : "2");
    formData.append("Remarks", remarks);
    // In your backend, projectId is int. If you use projectName, you might want to map it to projectId or pass a dummy value.
    formData.append("projectId", projectName || "0");
    // polygonFilePath only for prediction
    if (activeTab === "prediction" && polygonFile) formData.append("polygonFilePath", polygonFile);
    // ExcelId (if needed, hardcode 0 or let backend generate)
    formData.append("ExcelId", "0");

    try {
      const resp = await excelApi.uploadFile(formData)
      // resp should have: { success: true/false, errorMsag: string }
      if (resp.success) {
        toast.success("File processed successfully!");
        setSessionFiles([]);
        setPredictionFiles([]);
        setPolygonFile(null);
        setRemarks("");
        setProjectName("");
        setSelectedSessions([]);
        setErrorLog("");
        fetchUploadedFiles();
      } else {
        console.log(resp.errorMsag);
        setErrorLog(resp.errorMsag || "Processing failed. See details above.");
        toast.error("Processing failed. See error log.");
      }
    } catch (error) {
      toast.error(`Upload failed: ${error.message}`);
      setErrorLog(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      const blob = await excelApi.downloadTemplate(1);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", "Template.xlsx");
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      toast.error(`Failed to download template: ${error.message}`);
    }
  };

  // Helper: render file list with details
  const renderFileList = (files, type) =>
    files.length > 0 && (
      <div className="mt-4 space-y-2">
        {files.map((file, idx) => (
          <div key={idx} className="flex items-center justify-between bg-gray-100 rounded px-2 py-1">
            <div className="flex items-center gap-2">
              <File className="h-5 w-5 text-gray-500" />
              <span>{file.name}</span>
              <span className="text-xs text-gray-400">
                ({(file.size / 1024).toFixed(2)} KB)
              </span>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                removeFile(file, type);
              }}
              className="text-red-500 hover:text-red-700"
              title="Remove"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        ))}
      </div>
    );

  // Helper: render dropzone input
  const renderFileInput = (getRootProps, getInputProps, isDragActive, files, type, label) => (
    <div {...getRootProps()} className={`p-8 border-2 border-dashed rounded-lg text-center cursor-pointer transition-colors ${isDragActive ? "border-indigo-600 bg-indigo-50" : "border-gray-300"}`}>
      <input {...getInputProps()} />
      <UploadCloud className="mx-auto h-10 w-10 text-gray-400" />
      <p className="mt-2 text-sm text-gray-600">
        {label || (isDragActive ? "Drop the file here..." : "Drag 'n' drop a file here, or click to select")}
      </p>
      {renderFileList(files, type)}
    </div>
  );

  return (
    <div className="p-6 h-full flex flex-col items-center">
      <div className="w-full max-w-4xl">
        <h1 className="text-2xl font-semibold mb-4 text-center">Upload Data</h1>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="session">Upload Session Data</TabsTrigger>
            <TabsTrigger value="prediction">Upload Prediction Data</TabsTrigger>
          </TabsList>

          {/* SESSION TAB */}
          <TabsContent value="session" className="space-y-4 mt-4">
            {renderFileInput(getRootPropsSession, getInputPropsSession, isDragActiveSession, sessionFiles, "session", "Session File (.csv, .zip, .xls, .xlsx)")}
            <div>
              <label className="block font-semibold mb-1">Inbound Polygon File (Optional)</label>
              {renderFileInput(getRootPropsPolygon, getInputPropsPolygon, isDragActivePolygon, polygonFile ? [polygonFile] : [], "polygon", "Polygon File (.zip, .geojson, .json, .csv)")}
            </div>
            <Textarea placeholder="Remarks" value={remarks} onChange={(e) => setRemarks(e.target.value)} />
          </TabsContent>

          {/* PREDICTION TAB */}
          <TabsContent value="prediction" className="space-y-4 mt-4">
            {renderFileInput(getRootPropsPrediction, getInputPropsPrediction, isDragActivePrediction, predictionFiles, "prediction", "Prediction File (.csv, .zip, .xls, .xlsx)")}
            <div>
              <label className="block font-semibold mb-1">Inbound Polygon File (Optional)</label>
              {renderFileInput(getRootPropsPolygon, getInputPropsPolygon, isDragActivePolygon, polygonFile ? [polygonFile] : [], "polygon", "Polygon File (.zip, .geojson, .json, .csv)")}
            </div>
            <Input placeholder="Project Name" value={projectName} onChange={(e) => setProjectName(e.target.value)} />
            <SessionSelector selectedSessions={selectedSessions} setSelectedSessions={setSelectedSessions} />
            <Textarea placeholder="Remarks" value={remarks} onChange={(e) => setRemarks(e.target.value)} />
          </TabsContent>
        </Tabs>

        {/* Error Log Display */}
        {errorLog && (
          <div className="mt-6 p-4 bg-red-50 border border-red-300 text-red-700 rounded whitespace-pre-line max-h-60 overflow-auto">
            <div className="font-bold mb-2">Error Log:</div>
            <div>{errorLog}</div>
          </div>
        )}

        <div className="mt-8 text-center flex justify-center gap-4">
          <Button onClick={handleUpload} disabled={loading} size="lg">
            {loading ? <Spinner /> : "Upload & Process"}
          </Button>
          <Button onClick={handleDownloadTemplate} variant="outline" size="lg">
            <Download className="mr-2 h-4 w-4" />
            Download Template
          </Button>
        </div>

        {/* Uploaded Files History Table */}
        <div className="mt-10">
          <h2 className="text-xl font-semibold mb-4">Uploaded Files History</h2>
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>File Name</TableHead>
                  <TableHead>Uploaded By</TableHead>
                  <TableHead>Uploaded On</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Remarks</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {historyLoading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center">
                      <Spinner />
                    </TableCell>
                  </TableRow>
                ) : uploadedFiles.length > 0 ? (
                  uploadedFiles.map((file) => (
                    <TableRow key={file.id}>
                      <TableCell>{file.file_name}</TableCell>
                      <TableCell>{file.uploaded_by}</TableCell>
                      <TableCell>{new Date(file.uploaded_on).toLocaleString()}</TableCell>
                      <TableCell>{file.status}</TableCell>
                      <TableCell>{file.remarks}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center h-24">
                      No history found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UploadDataPage;