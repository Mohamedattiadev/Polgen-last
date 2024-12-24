import React, { useState, useEffect, useMemo } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Typography,
  CircularProgress,
  TablePagination,
  Box,
  Button,
  TextField,
} from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import HourglassBottomIcon from "@mui/icons-material/HourglassBottom";
import { fetchUsers, approveUser } from "../../../../api/auth"; // Ensure API functions are correctly implemented
import styles from "./AdminMailTables.module.css";

const AdminMailTables = () => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [processing, setProcessing] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const users = await fetchUsers();
        setRows(users);
      } catch (error) {
        setError("Failed to load user data. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleSearch = (event) => {
    setSearchQuery(event.target.value.toLowerCase());
  };

  const handleToggleApproval = async (id, currentStatus) => {
    const newStatus = !currentStatus;
    setProcessing((prev) => [...prev, id]);

    try {
      await approveUser(id, newStatus);
      const updatedRows = rows.map((row) =>
        row.id === id ? { ...row, isApprovedFromAdmin: newStatus } : row
      );
      setRows(updatedRows);
    } catch (error) {
      setError("Failed to update approval status. Please try again.");
    } finally {
      setProcessing((prev) => prev.filter((pid) => pid !== id));
    }
  };

  const filteredRows = useMemo(() => {
    return rows.filter(
      (row) =>
        row.email.toLowerCase().includes(searchQuery) ||
        row.username.toLowerCase().includes(searchQuery)
    );
  }, [rows, searchQuery]);

  const handleChangePage = (event, newPage) => setPage(newPage);
  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const visibleRows = useMemo(() => {
    return filteredRows.slice(
      page * rowsPerPage,
      page * rowsPerPage + rowsPerPage
    );
  }, [filteredRows, page, rowsPerPage]);

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <CircularProgress />
        <Typography variant="h6">Loading users...</Typography>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.errorContainer}>
        <Typography variant="h6">{error}</Typography>
      </div>
    );
  }

  return (
    <div className={styles.tableContainer}>
      <div className={styles.header}>
        <Typography variant="h6" className={styles.title}>
          Admin User List
        </Typography>
        <TextField
          className={styles.tableSearchInput}
          label="Search"
          variant="outlined"
          size="small"
          value={searchQuery}
          onChange={handleSearch}
        />
      </div>

      <TableContainer component={Paper} className={styles.tableWrapper}>
        <Table>
          <TableHead>
            <TableRow className={styles.tableRow}>
              <TableCell className={styles.tableCellHead}>ID</TableCell>
              <TableCell className={styles.tableCellHead}>Email</TableCell>
              <TableCell className={styles.tableCellHead}>Name</TableCell>
              <TableCell className={styles.tableCellHead}>Status</TableCell>
              <TableCell className={styles.tableCellHead}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {visibleRows.map((row) => (
              <TableRow key={row.id} className={styles.tableRow}>
                <TableCell className={styles.tableCell}>
                  {row.id.split("-")[0]}
                </TableCell>
                <TableCell className={styles.tableCell}>{row.email}</TableCell>
                <TableCell className={styles.tableCell}>
                  {row.username}
                </TableCell>
                <TableCell className={styles.tableCell}>
                  {row.isApprovedFromAdmin ? (
                    <CheckCircleIcon
                      className={`${styles.statusIcon} ${styles.approved}`}
                    />
                  ) : (
                    <CheckCircleIcon
                      className={`${styles.statusIcon} ${styles.pending}`}
                    />
                  )}
                </TableCell>
                <TableCell className={styles.tableCell}>
                  <Button
                    className={`${styles.actionButton} ${
                      row.isApprovedFromAdmin
                        ? styles.revokeButton
                        : styles.approveButton
                    }`}
                    onClick={() =>
                      handleToggleApproval(row.id, row.isApprovedFromAdmin)
                    }
                    disabled={processing.includes(row.id)}
                  >
                    {processing.includes(row.id) ? (
                      <HourglassBottomIcon className={styles.loadingIcon} />
                    ) : row.isApprovedFromAdmin ? (
                      "Revoke"
                    ) : (
                      "Approve"
                    )}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        <TablePagination
          className={styles.tablePagination}
          rowsPerPageOptions={[5, 10, 25]}
          component="div"
          count={filteredRows.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
      </TableContainer>
    </div>
  );
};

export default AdminMailTables;
